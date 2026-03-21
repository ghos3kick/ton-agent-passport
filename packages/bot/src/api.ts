import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs';
import path from 'path';
import { Address, Cell } from '@ton/core';
import { config } from './config';
import { buildMintBody, sendMintTransaction } from './services/mint';
import { getSDK } from './services/passport';
import { calculateTrustScore } from './services/reputation';
import { isInitialized as isWalletReady } from './services/directWallet';
import { getAgentVolume, loadVolumes } from './services/txMonitor';

function decodeBocString(hex: string): string {
    try {
        const cell = Cell.fromBoc(Buffer.from(hex, 'hex'))[0];
        const slice = cell.beginParse();
        // Read all remaining bits as string
        return slice.loadStringTail();
    } catch {
        return '';
    }
}

function decodeBocAddress(hex: string): string {
    try {
        const cell = Cell.fromBoc(Buffer.from(hex, 'hex'))[0];
        const slice = cell.beginParse();
        const addr = slice.loadAddress();
        return addr?.toString({ testOnly: config.network === 'testnet', bounceable: true }) ?? '';
    } catch {
        return '';
    }
}

function normalizeAddress(addr: string): string {
    try {
        if (addr.startsWith('0:') || addr.startsWith('-1:')) {
            return Address.parseRaw(addr).toString({ testOnly: config.network === 'testnet', bounceable: true });
        }
        return Address.parse(addr).toString({ testOnly: config.network === 'testnet', bounceable: true });
    } catch {
        return addr;
    }
}

function isValidHttpUrl(str: string): boolean {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function isPrivateHost(urlStr: string): boolean {
    try {
        const url = new URL(urlStr);
        const host = url.hostname.toLowerCase();

        // Strip IPv6 brackets if present
        const bare = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;

        // Block well-known private hostnames
        if (bare === 'localhost' || bare === '0.0.0.0') return true;

        // Block IPv6 loopback and link-local
        if (bare === '::1' || bare === '::' || bare.startsWith('fe80:') || bare.startsWith('fc') || bare.startsWith('fd')) return true;
        // Block IPv4-mapped IPv6 (::ffff:127.0.0.1)
        if (bare.startsWith('::ffff:')) {
            const mapped = bare.slice(7);
            if (isPrivateIPv4(mapped)) return true;
        }

        // Block decimal/octal/hex encoded IPv4
        const decoded = decodeIPv4(bare);
        if (decoded && isPrivateIPv4(decoded)) return true;

        // Standard dotted-quad check
        if (isPrivateIPv4(bare)) return true;

        // Block DNS rebinding patterns (*.localhost, nip.io, sslip.io, xip.io etc.)
        if (bare.endsWith('.localhost') || bare.endsWith('.local')) return true;
        if (/\.(nip|sslip|xip)\.io$/i.test(bare)) return true;

        return false;
    } catch {
        return true;
    }
}

function isPrivateIPv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    const nums = parts.map(Number);
    if (nums.some(n => isNaN(n) || n < 0 || n > 255)) return false;
    if (nums[0] === 127) return true;                                    // 127.0.0.0/8
    if (nums[0] === 10) return true;                                     // 10.0.0.0/8
    if (nums[0] === 192 && nums[1] === 168) return true;                // 192.168.0.0/16
    if (nums[0] === 172 && nums[1] >= 16 && nums[1] <= 31) return true; // 172.16.0.0/12
    if (nums[0] === 169 && nums[1] === 254) return true;                // 169.254.0.0/16
    if (nums[0] === 0) return true;                                      // 0.0.0.0/8
    return false;
}

function decodeIPv4(host: string): string | null {
    // Detect decimal IP (e.g. 2130706433 = 127.0.0.1)
    if (/^\d+$/.test(host)) {
        const num = parseInt(host, 10);
        if (num >= 0 && num <= 0xFFFFFFFF) {
            return [(num >>> 24) & 0xFF, (num >>> 16) & 0xFF, (num >>> 8) & 0xFF, num & 0xFF].join('.');
        }
    }
    // Detect octal notation (e.g. 0177.0.0.1)
    const parts = host.split('.');
    if (parts.length === 4 && parts.some(p => p.startsWith('0') && p.length > 1)) {
        const nums = parts.map(p => p.startsWith('0x') ? parseInt(p, 16) : p.startsWith('0') ? parseInt(p, 8) : parseInt(p, 10));
        if (nums.every(n => !isNaN(n) && n >= 0 && n <= 255)) {
            return nums.join('.');
        }
    }
    return null;
}

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function validateTelegramInitData(initData: string, botToken: string): boolean {
    try {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) return false;

        // Remove hash from params and sort alphabetically
        params.delete('hash');
        const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
        const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

        // HMAC-SHA256 with "WebAppData" as key, then with bot token
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (hash.length !== computedHash.length) return false;
        const isValid = crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));

        // Check auth_date is not too old (5 minutes — allows slow networks and form filling)
        const authDate = parseInt(params.get('auth_date') || '0', 10);
        const now = Math.floor(Date.now() / 1000);
        if (now - authDate > 300) return false;

        return isValid;
    } catch {
        return false;
    }
}

// ===== initData Nonce Dedup =====
// Prevents replay of the same Telegram initData within its validity window
const usedInitDataHashes = new Map<string, number>();
setInterval(() => {
    const now = Date.now();
    for (const [hash, ts] of usedInitDataHashes) {
        if (now - ts > 330_000) usedInitDataHashes.delete(hash); // cleanup after 5.5 min
    }
}, 60_000);

function checkInitDataNonce(initData: string): boolean {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;
    if (usedInitDataHashes.has(hash)) return false;
    usedInitDataHashes.set(hash, Date.now());
    return true;
}

// ===== Agent Names Store =====
const DATA_DIR = path.resolve(__dirname, '../../../data');
const NAMES_FILE = path.join(DATA_DIR, 'agent-names.json');

let agentNames: Record<string, string> = {};
try {
    mkdirSync(DATA_DIR, { recursive: true });
    const raw: Record<string, string> = JSON.parse(readFileSync(NAMES_FILE, 'utf-8'));
    // Migrate keys: re-normalize all addresses so testnet format matches lookup
    for (const [key, value] of Object.entries(raw)) {
        const normalized = normalizeAddress(key);
        agentNames[normalized] = value;
    }
} catch { agentNames = {}; }

function atomicWriteSync(filePath: string, data: string) {
    const tmpPath = filePath + '.tmp';
    writeFileSync(tmpPath, data);
    renameSync(tmpPath, filePath);
}

function saveAgentName(ownerAddress: string, name: string) {
    agentNames[ownerAddress] = name;
    try {
        atomicWriteSync(NAMES_FILE, JSON.stringify(agentNames, null, 2));
    } catch (err) {
        console.error('Failed to save agent name:', err instanceof Error ? err.message : 'unknown');
    }
}

function getAgentName(ownerAddress: string): string | null {
    // Check confirmed names first, then pending
    return agentNames[ownerAddress] || pendingNames.get(ownerAddress)?.name || null;
}

// Pending names: saved when payload is requested, promoted on cache refresh if passport exists
const pendingNames = new Map<string, { name: string; expires: number }>();
const PENDING_NAME_TTL = 10 * 60_000; // 10 minutes — enough for user to sign & confirm tx
setInterval(() => {
    const now = Date.now();
    for (const [addr, entry] of pendingNames) {
        if (now > entry.expires) pendingNames.delete(addr);
    }
}, 60_000);

function savePendingName(ownerAddress: string, name: string) {
    pendingNames.set(ownerAddress, { name, expires: Date.now() + PENDING_NAME_TTL });
}

function promotePendingNames(activeOwners: Set<string>) {
    for (const [addr, entry] of pendingNames) {
        if (activeOwners.has(addr)) {
            saveAgentName(addr, entry.name);
            pendingNames.delete(addr);
        }
    }
}

function extractNameFromEndpoint(endpoint: string): string {
    try {
        const url = new URL(endpoint);
        const host = url.hostname.replace('www.', '').split('.')[0];
        return host.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    } catch {
        return '';
    }
}

// Name validation regex: letters, numbers, spaces, dots, hyphens
const NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9 .\-]{1,48}[a-zA-Z0-9.]$/;

// Server-side blocklist for passports that should be hidden
const BLOCKLIST_FILE = path.join(DATA_DIR, 'blocklist.json');
let blocklist: string[] = [];
try {
    blocklist = JSON.parse(readFileSync(BLOCKLIST_FILE, 'utf-8'));
} catch { blocklist = []; }

function addToBlocklist(sbtAddress: string) {
    if (!blocklist.includes(sbtAddress)) {
        blocklist.push(sbtAddress);
        try {
            atomicWriteSync(BLOCKLIST_FILE, JSON.stringify(blocklist, null, 2));
        } catch (err) {
            console.error('Failed to save blocklist:', err instanceof Error ? err.message : 'unknown');
        }
    }
}

function isBlocked(sbtAddress: string): boolean {
    return blocklist.includes(sbtAddress);
}

export function createApiServer() {
    // Load persisted tx volumes for weighted scoring
    loadVolumes();

    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', 'loopback');

    // Security headers (defense-in-depth — nginx also sets these)
    app.use((_req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
        next();
    });

    const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean);
    if (corsOrigins && corsOrigins.length > 0) {
        app.use(cors({ origin: corsOrigins }));
    }
    app.use(express.json({ limit: '10kb' }));

    // === Global rate limiter: 100 req/min per IP for all /api/ endpoints ===
    const globalRateMap = new Map<string, number[]>();
    setInterval(() => {
        const now = Date.now();
        for (const [ip, timestamps] of globalRateMap) {
            const valid = timestamps.filter(t => now - t < 60_000);
            if (valid.length === 0) globalRateMap.delete(ip);
            else globalRateMap.set(ip, valid);
        }
    }, 60_000);

    app.use('/api', (req, res, next) => {
        const ip = req.ip || 'unknown';
        const now = Date.now();
        const window = 60_000;
        const max = 100;
        const timestamps = (globalRateMap.get(ip) || []).filter(t => now - t < window);
        if (timestamps.length >= max) {
            return res.status(429).json({ error: 'Too many requests. Limit: 100 req/min.' });
        }
        timestamps.push(now);
        globalRateMap.set(ip, timestamps);
        next();
    });

    // === Brute force protection: 10 failed auth attempts → 15 min lockout per IP ===
    const authFailMap = new Map<string, { count: number; lockedUntil: number }>();
    setInterval(() => {
        const now = Date.now();
        for (const [ip, entry] of authFailMap) {
            if (entry.lockedUntil < now && entry.count === 0) authFailMap.delete(ip);
        }
    }, 300_000);

    function checkAuthBrute(ip: string): boolean {
        const entry = authFailMap.get(ip);
        if (entry && entry.lockedUntil > Date.now()) return false;
        return true;
    }
    function recordAuthFailure(ip: string) {
        const now = Date.now();
        const entry = authFailMap.get(ip) || { count: 0, lockedUntil: 0 };
        entry.count++;
        if (entry.count >= 10) {
            entry.lockedUntil = now + 15 * 60_000; // 15 min lockout
            entry.count = 0;
        }
        authFailMap.set(ip, entry);
    }
    function resetAuthFailure(ip: string) {
        authFailMap.delete(ip);
    }

    // Reject non-JSON Content-Type on POST/PUT/PATCH
    app.use('/api', (req, res, next) => {
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
            return res.status(415).json({ error: 'Content-Type must be application/json' });
        }
        next();
    });

    // Health check — no wallet state leak
    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok' });
    });

    // Auto-mint endpoint
    app.post('/api/mint', async (req, res) => {
        try {
            const ip = req.ip || 'unknown';

            // 0. Brute force check
            if (!checkAuthBrute(ip)) {
                res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
                return;
            }

            // 1. Authenticate FIRST: admin API key OR valid Telegram initData
            const apiKey = req.headers['x-admin-api-key'] as string | undefined;
            const telegramInitData = req.body?.telegramInitData as string | undefined;
            const hasValidApiKey = apiKey && config.adminApiKey && timingSafeEqual(apiKey, config.adminApiKey);
            const hasValidInitData = telegramInitData ? validateTelegramInitData(telegramInitData, config.botToken) : false;

            if (!hasValidApiKey && !hasValidInitData) {
                recordAuthFailure(ip);
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Replay protection: reject reused initData
            if (hasValidInitData && telegramInitData && !checkInitDataNonce(telegramInitData)) {
                res.status(401).json({ error: 'initData already used' });
                return;
            }
            resetAuthFailure(ip);

            // 2. Then validate fields
            const { owner, endpoint = '', capabilities, metadata } = req.body;
            const name = (req.body.name ?? '').trim();

            // Validate name (required)
            if (!name || name.length < 3) {
                res.status(400).json({ error: 'Agent name required (min 3 chars)' });
                return;
            }
            if (name.length > 50) {
                res.status(400).json({ error: 'Agent name too long (max 50 chars)' });
                return;
            }
            if (!NAME_PATTERN.test(name)) {
                res.status(400).json({ error: 'Agent name: letters, numbers, spaces, dots, hyphens only' });
                return;
            }

            // Validate required fields
            if (!owner || !capabilities || !metadata) {
                res.status(400).json({ error: 'Required fields: owner, capabilities, metadata' });
                return;
            }

            // Validate field lengths
            const MAX_LEN = 256;
            if (owner.length > 100 || (endpoint && endpoint.length > MAX_LEN) ||
                capabilities.length > MAX_LEN || metadata.length > MAX_LEN) {
                res.status(400).json({ error: 'Field too long (max 256 chars)' });
                return;
            }

            // Validate TON address
            let ownerAddress: Address;
            try {
                ownerAddress = Address.parse(owner);
            } catch {
                res.status(400).json({ error: 'Invalid TON address' });
                return;
            }

            // Validate URLs
            if (endpoint && !isValidHttpUrl(endpoint)) {
                res.status(400).json({ error: 'endpoint must be a valid http/https URL' });
                return;
            }
            if (!isValidHttpUrl(metadata)) {
                res.status(400).json({ error: 'metadata must be a valid http/https URL' });
                return;
            }
            if ((endpoint && isPrivateHost(endpoint)) || isPrivateHost(metadata)) {
                res.status(400).json({ error: 'URLs must not point to private/internal addresses' });
                return;
            }

            // Duplicate mint protection: check if owner already has a passport
            try {
                const { active } = await getAllPassports();
                const normalizedOwner = ownerAddress.toString({ testOnly: config.network === 'testnet', bounceable: true });
                const existing = active.find(p => p.owner === normalizedOwner);
                if (existing) {
                    res.status(409).json({ error: 'Owner already has an active passport', existingAddress: existing.address });
                    return;
                }
            } catch {
                // If cache is unavailable, allow mint to proceed
            }

            // Check direct wallet is ready
            if (!isWalletReady()) {
                res.status(503).json({ error: 'Wallet not initialized. Check MNEMONIC in .env.' });
                return;
            }

            // Build and send mint transaction
            const mintBody = buildMintBody({
                queryId: BigInt(Date.now()),
                owner: ownerAddress,
                capabilities,
                endpoint,
                metadataUrl: metadata,
            });

            const txHash = await sendMintTransaction(config.registryAddress, mintBody);

            // Save agent name (use normalized address to match lookup in cache)
            if (name) {
                saveAgentName(ownerAddress.toString({ testOnly: config.network === 'testnet', bounceable: true }), name);
            }

            res.json({
                success: true,
                txHash: txHash || 'pending',
                message: 'Passport minted successfully',
            });
        } catch (error: unknown) {
            console.error('Auto-mint error:', error instanceof Error ? error.message : 'unknown');
            res.status(500).json({ error: 'Mint failed' });
        }
    });

    // Rate limiter for public-mint-payload (5 req/min per IP)
    const publicMintRateMap = new Map<string, number[]>();
    setInterval(() => {
        const now = Date.now();
        for (const [ip, timestamps] of publicMintRateMap) {
            const valid = timestamps.filter(t => now - t < 60_000);
            if (valid.length === 0) publicMintRateMap.delete(ip);
            else publicMintRateMap.set(ip, valid);
        }
    }, 60_000);
    function checkPublicMintRate(ip: string): boolean {
        const now = Date.now();
        const window = 60_000; // 1 minute
        const max = 5;
        const timestamps = (publicMintRateMap.get(ip) || []).filter(t => now - t < window);
        if (timestamps.length >= max) return false;
        timestamps.push(now);
        publicMintRateMap.set(ip, timestamps);
        return true;
    }

    // Public mint payload endpoint — returns tx payload for TON Connect signing
    app.post('/api/public-mint-payload', async (req, res) => {
        try {
            // Rate limit
            const ip = req.ip || 'unknown';
            if (!checkPublicMintRate(ip)) {
                res.status(429).json({ error: 'Too many requests, please wait 60 seconds' });
                return;
            }

            // Optional Telegram initData validation — if provided, must be valid
            const telegramInitData = req.body?.telegramInitData as string | undefined;
            if (telegramInitData) {
                if (!validateTelegramInitData(telegramInitData, config.botToken)) {
                    res.status(401).json({ error: 'Invalid Telegram initData' });
                    return;
                }
                if (!checkInitDataNonce(telegramInitData)) {
                    res.status(401).json({ error: 'initData already used' });
                    return;
                }
            }

            const { owner, endpoint = '', capabilities, metadata } = req.body;
            const publicName = (req.body.name ?? '').trim();

            // Validate name
            if (!publicName || publicName.length < 3) {
                res.status(400).json({ error: 'Agent name required (min 3 chars)' });
                return;
            }
            if (publicName.length > 50) {
                res.status(400).json({ error: 'Agent name too long (max 50 chars)' });
                return;
            }
            if (!NAME_PATTERN.test(publicName)) {
                res.status(400).json({ error: 'Agent name: letters, numbers, spaces, dots, hyphens only' });
                return;
            }

            if (!owner || !capabilities || !metadata) {
                res.status(400).json({ error: 'Required fields: owner, capabilities, metadata' });
                return;
            }

            const MAX_LEN = 256;
            if ((endpoint && endpoint.length > MAX_LEN) || capabilities.length > MAX_LEN || metadata.length > MAX_LEN) {
                res.status(400).json({ error: 'Field too long (max 256 chars)' });
                return;
            }

            if (endpoint && !isValidHttpUrl(endpoint)) {
                res.status(400).json({ error: 'endpoint must be a valid http/https URL' });
                return;
            }
            if (!isValidHttpUrl(metadata)) {
                res.status(400).json({ error: 'metadata must be a valid http/https URL' });
                return;
            }
            if ((endpoint && isPrivateHost(endpoint)) || isPrivateHost(metadata)) {
                res.status(400).json({ error: 'URLs must not point to private/internal addresses' });
                return;
            }

            let ownerAddress: Address;
            try {
                ownerAddress = Address.parse(owner);
            } catch {
                res.status(400).json({ error: 'Invalid TON address' });
                return;
            }

            // Duplicate mint protection
            try {
                const { active } = await getAllPassports();
                const normalizedOwner = ownerAddress.toString({ testOnly: config.network === 'testnet', bounceable: true });
                const existing = active.find(p => p.owner === normalizedOwner);
                if (existing) {
                    res.status(409).json({ error: 'Owner already has an active passport', existingAddress: existing.address });
                    return;
                }
            } catch {
                // If cache is unavailable, allow mint to proceed
            }

            // PublicMintPassport opcode from compiled Tact contract
            const PUBLIC_MINT_OPCODE = 534822672;
            const { beginCell: bc } = await import('@ton/core');
            const body = bc()
                .storeUint(PUBLIC_MINT_OPCODE, 32)
                .storeAddress(ownerAddress)
                .storeStringRefTail(endpoint)
                .storeStringRefTail(capabilities)
                .storeStringRefTail(metadata)
                .endCell();

            const payload = body.toBoc().toString('base64');

            // Save name as pending — promoted to confirmed when passport appears on-chain.
            // Pending names expire after 10 minutes if tx is never signed.
            if (publicName) {
                savePendingName(ownerAddress.toString({ testOnly: config.network === 'testnet', bounceable: true }), publicName);
            }

            // 0.05 fee + 0.06 gas + small buffer
            const amount = '120000000'; // 0.12 TON

            res.json({
                success: true,
                payload,
                address: config.registryAddress,
                amount,
                message: 'Sign this transaction in your wallet',
            });
        } catch (error: unknown) {
            console.error('Public mint payload error:', error instanceof Error ? error.message : 'unknown');
            res.status(500).json({ error: 'Failed to build payload' });
        }
    });

    // Rate limiter for reputation endpoint (5 req/sec per IP)
    const reputationRateMap = new Map<string, number[]>();
    setInterval(() => {
        const now = Date.now();
        for (const [ip, timestamps] of reputationRateMap) {
            const valid = timestamps.filter(t => now - t < 1000);
            if (valid.length === 0) reputationRateMap.delete(ip);
            else reputationRateMap.set(ip, valid);
        }
    }, 60_000);
    function checkReputationRate(ip: string): boolean {
        const now = Date.now();
        const window = 1000; // 1 second
        const max = 5;
        const timestamps = (reputationRateMap.get(ip) || []).filter(t => now - t < window);
        if (timestamps.length >= max) return false;
        timestamps.push(now);
        reputationRateMap.set(ip, timestamps);
        return true;
    }

    // Reputation endpoint — searches passports cache by owner or SBT address
    app.get('/api/agent-name/:address', (req, res) => {
        const addr = (req.params as Record<string, string>).address;
        const name = getAgentName(addr) || null;
        res.json({ name });
    });

    app.get(['/api/reputation/:address', '/api/reputation'], async (req, res) => {
        try {
            const address = (req.params as Record<string, string>).address || (req.query.address as string);

            // Rate limit
            const ip = req.ip || 'unknown';
            if (!checkReputationRate(ip)) {
                res.status(429).json({ error: 'Too many requests' });
                return;
            }

            if (!address) {
                res.status(400).json({ error: 'Address required (use /api/reputation/:address or ?address=...)' });
                return;
            }

            // Validate address
            let normalizedSearch: string;
            try {
                normalizedSearch = Address.parse(address).toString({ testOnly: config.network === 'testnet', bounceable: true });
            } catch {
                res.status(400).json({ error: 'Invalid TON address' });
                return;
            }

            // Search in shared passports cache (same data as /api/passports)
            const { active } = await getAllPassports();
            const passport = active.find(p => {
                try {
                    const normalizedOwner = Address.parse(p.owner).toString({ testOnly: config.network === 'testnet', bounceable: true });
                    if (normalizedOwner === normalizedSearch) return true;
                } catch { /* skip */ }
                try {
                    const normalizedAddr = Address.parse(p.address).toString({ testOnly: config.network === 'testnet', bounceable: true });
                    if (normalizedAddr === normalizedSearch) return true;
                } catch { /* skip */ }
                return false;
            });

            if (!passport) {
                res.json({
                    found: false,
                    score: 0,
                    level: 'none',
                    breakdown: { existence: 0, activity: 0, age: 0, capabilities: 0 },
                    message: 'No passport found for this address',
                });
                return;
            }

            const txVolume = getAgentVolume(passport.address);
            const score = calculateTrustScore({
                owner: passport.owner,
                endpoint: passport.endpoint,
                capabilities: passport.capabilities,
                txCount: passport.txCount,
                createdAt: passport.createdAt,
                revokedAt: passport.revokedAt,
                txVolume,
            });

            res.json({
                found: true,
                address: passport.address,
                score: score.total,
                level: score.level,
                breakdown: score.breakdown,
                passport: {
                    owner: passport.owner,
                    endpoint: passport.endpoint,
                    capabilities: passport.capabilities,
                    txCount: passport.txCount,
                    txVolume,
                    createdAt: passport.createdAt,
                    revokedAt: passport.revokedAt,
                    isActive: passport.isActive,
                },
            });
        } catch (error: unknown) {
            console.error('Reputation error:', error instanceof Error ? error.message : 'unknown');
            res.status(500).json({ error: 'Failed to fetch reputation' });
        }
    });

    // Rate limiter for passports list endpoint (5 req/sec per IP)
    const passportsRateMap = new Map<string, number[]>();
    setInterval(() => {
        const now = Date.now();
        for (const [ip, timestamps] of passportsRateMap) {
            const valid = timestamps.filter(t => now - t < 1000);
            if (valid.length === 0) passportsRateMap.delete(ip);
            else passportsRateMap.set(ip, valid);
        }
    }, 60_000);
    function checkPassportsRate(ip: string): boolean {
        const now = Date.now();
        const window = 1000;
        const max = 5;
        const timestamps = (passportsRateMap.get(ip) || []).filter(t => now - t < window);
        if (timestamps.length >= max) return false;
        timestamps.push(now);
        passportsRateMap.set(ip, timestamps);
        return true;
    }

    // In-memory cache for passports list
    interface CachedPassport {
        index: number;
        address: string;
        owner: string;
        name: string;
        endpoint: string;
        capabilities: string;
        metadataUrl: string;
        txCount: number;
        createdAt: number;
        revokedAt: number;
        isActive: boolean;
        trustScore: { total: number; level: string };
    }
    let passportsCache: { data: CachedPassport[]; total: number; totalOnChain: number; timestamp: number } | null = null;
    const PASSPORTS_CACHE_TTL = 60_000; // 60 seconds fresh
    const DISK_CACHE_FILE = path.join(DATA_DIR, 'passports-cache.json');
    let backgroundRefreshRunning = false;

    // Load disk cache on startup for instant first response
    try {
        const diskData = JSON.parse(readFileSync(DISK_CACHE_FILE, 'utf-8'));
        if (diskData?.data?.length > 0) {
            passportsCache = { ...diskData, timestamp: Date.now() - PASSPORTS_CACHE_TTL + 5000 };
        }
    } catch { /* no disk cache yet */ }

    function saveCacheToDisk() {
        try {
            atomicWriteSync(DISK_CACHE_FILE, JSON.stringify(passportsCache));
        } catch { /* non-critical */ }
    }

    // Background refresh: update cache without blocking the response
    function triggerBackgroundRefresh() {
        if (backgroundRefreshRunning) return;
        backgroundRefreshRunning = true;
        refreshPassportsCache().catch(err => {
            console.error('Background passport refresh failed:', (err as Error).message);
        }).finally(() => { backgroundRefreshRunning = false; });
    }

    // Shared function: load all active passports (used by /api/passports and /api/reputation)
    async function getAllPassports(): Promise<{ active: CachedPassport[]; totalOnChain: number }> {
        // Fresh cache — return immediately
        if (passportsCache && Date.now() - passportsCache.timestamp < PASSPORTS_CACHE_TTL) {
            return { active: passportsCache.data, totalOnChain: passportsCache.totalOnChain };
        }
        // Stale cache exists — return stale data, refresh in background
        if (passportsCache?.data?.length) {
            triggerBackgroundRefresh();
            return { active: passportsCache.data, totalOnChain: passportsCache.totalOnChain };
        }
        // No cache at all — must wait for first load
        await refreshPassportsCache();
        return { active: passportsCache!.data, totalOnChain: passportsCache!.totalOnChain };
    }

    async function refreshPassportsCache(): Promise<void> {
        const TONAPI_KEY = config.tonapiKey;
        const BASE = config.network === 'testnet'
            ? 'https://testnet.tonapi.io/v2'
            : 'https://tonapi.io/v2';
        const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (TONAPI_KEY) apiHeaders['Authorization'] = `Bearer ${TONAPI_KEY}`;

        // Single request: fetch collection items (skip separate getTotalPassports call)
        const collectionRes = await fetch(
            `${BASE}/nfts/collections/${encodeURIComponent(config.registryAddress)}/items?limit=200&offset=0`,
            { headers: apiHeaders }
        );
        const collectionData = await collectionRes.json();
        const nftItems = (collectionData as Record<string, unknown>).nft_items as Record<string, unknown>[] || [];
        const totalOnChain = nftItems.length;

        if (totalOnChain === 0) {
            passportsCache = { data: [], total: 0, totalOnChain: 0, timestamp: Date.now() };
            return;
        }

        // Build lookup from previous cache to skip already-enriched passports
        const prevByAddress = new Map<string, CachedPassport>();
        if (passportsCache?.data) {
            for (const p of passportsCache.data) prevByAddress.set(p.address, p);
        }

        // Enrich passports in parallel (batches of 10 to respect rate limits)
        const BATCH_SIZE = 10;
        async function enrichItem(item: Record<string, unknown>): Promise<CachedPassport | null> {
            try {
                const addr = item.address as string;
                const passportUrl = `${BASE}/blockchain/accounts/${encodeURIComponent(addr)}/methods/get_passport_data`;
                let passData: Record<string, unknown> = {};
                for (let _attempt = 0; _attempt < 2; _attempt++) {
                    if (_attempt > 0) await new Promise(r => setTimeout(r, 500));
                    const passRes = await fetch(passportUrl, { headers: apiHeaders });
                    if (passRes.status === 429) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                    passData = await passRes.json() as Record<string, unknown>;
                    if (passData.stack || passData.decoded) break;
                }

                let capabilities = '';
                let endpoint = '';
                let metadataUrl = '';
                let createdAt = 0;
                let txCount = 0;
                let revokedAt = 0;
                const itemOwner = item.owner as Record<string, string> | undefined;
                let ownerAddress = itemOwner?.address ? normalizeAddress(itemOwner.address) : '';

                const decoded = passData.decoded as Record<string, string | number> | undefined;
                if (decoded && typeof decoded === 'object' && decoded.capabilities) {
                    capabilities = String(decoded.capabilities ?? '');
                    endpoint = String(decoded.endpoint ?? '');
                    metadataUrl = String(decoded.metadataUrl ?? decoded.metadata_url ?? '');
                    createdAt = Number(decoded.createdAt ?? decoded.created_at ?? 0);
                    txCount = Number(decoded.txCount ?? decoded.tx_count ?? 0);
                    revokedAt = Number(decoded.revokedAt ?? decoded.revoked_at ?? 0);
                    if (decoded.owner) ownerAddress = normalizeAddress(String(decoded.owner));
                } else if (Array.isArray(passData.stack) && passData.stack.length >= 7) {
                    const stack = passData.stack as Array<Record<string, string>>;
                    const ownerHex = stack[0]?.cell || stack[0]?.slice || '';
                    if (ownerHex) ownerAddress = decodeBocAddress(ownerHex) || ownerAddress;
                    capabilities = decodeBocString(stack[1]?.cell || stack[1]?.slice || '');
                    endpoint = decodeBocString(stack[2]?.cell || stack[2]?.slice || '');
                    metadataUrl = decodeBocString(stack[3]?.cell || stack[3]?.slice || '');
                    createdAt = Number(stack[4]?.num ?? '0');
                    txCount = Number(stack[5]?.num ?? '0');
                    revokedAt = Number(stack[6]?.num ?? '0');
                }

                const sbtVolume = getAgentVolume(addr);
                const score = calculateTrustScore({
                    owner: ownerAddress,
                    endpoint,
                    capabilities,
                    txCount,
                    createdAt,
                    revokedAt,
                    txVolume: sbtVolume,
                });

                if (revokedAt !== 0) return null;
                if (isBlocked(addr)) return null;

                const agentName = getAgentName(ownerAddress)
                    || extractNameFromEndpoint(endpoint)
                    || `Agent #${(item.index as number) ?? 0}`;

                return {
                    index: (item.index as number) ?? 0,
                    address: addr,
                    owner: ownerAddress,
                    name: agentName,
                    endpoint,
                    capabilities,
                    metadataUrl,
                    txCount,
                    createdAt,
                    revokedAt,
                    isActive: revokedAt === 0,
                    trustScore: { total: score.total, level: score.level },
                };
            } catch (err) {
                console.error(`Failed to fetch passport ${(item as Record<string, unknown>).address}:`, (err as Error).message);
                return null;
            }
        }

        const enriched: CachedPassport[] = [];
        const toEnrich: Record<string, unknown>[] = [];
        for (const item of nftItems) {
            const addr = item.address as string;
            const cached = prevByAddress.get(addr);
            if (cached) {
                enriched.push(cached);
            } else {
                toEnrich.push(item);
            }
        }
        for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
            const batch = toEnrich.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(batch.map(enrichItem));
            for (const r of results) {
                if (r) enriched.push(r);
            }
        }

        // Deduplicate by owner: keep the highest-index passport per owner
        const byOwner = new Map<string, CachedPassport>();
        for (const p of enriched) {
            const existing = byOwner.get(p.owner);
            if (!existing || p.index > existing.index) {
                byOwner.set(p.owner, p);
            }
        }
        const deduped = Array.from(byOwner.values()).sort((a, b) => a.index - b.index);

        // Promote pending names for owners that now have on-chain passports
        promotePendingNames(new Set(deduped.map(p => p.owner)));

        passportsCache = { data: deduped, total: deduped.length, totalOnChain, timestamp: Date.now() };
        saveCacheToDisk();
    }

    // Passports explorer endpoint
    app.get('/api/passports', async (req, res) => {
        try {
            const ip = req.ip || 'unknown';
            if (!checkPassportsRate(ip)) {
                res.status(429).json({ error: 'Too many requests' });
                return;
            }

            const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
            const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

            const { active, totalOnChain } = await getAllPassports();

            res.json({
                total: active.length,
                totalOnChain,
                revoked: totalOnChain - active.length,
                offset,
                limit,
                passports: active.slice(offset, offset + limit),
            });
        } catch (error: unknown) {
            console.error('Passports list error:', error instanceof Error ? error.message : 'unknown');
            res.status(500).json({ error: 'Failed to fetch passports' });
        }
    });

    app.post('/api/revoke', async (req, res) => {
        try {
            const ip = req.ip || 'unknown';

            if (!checkAuthBrute(ip)) {
                res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
                return;
            }

            const apiKey = req.headers['x-admin-api-key'] as string | undefined;
            if (!apiKey || !config.adminApiKey || !timingSafeEqual(apiKey, config.adminApiKey)) {
                recordAuthFailure(ip);
                res.status(401).json({ error: 'Admin API key required' });
                return;
            }
            resetAuthFailure(ip);

            const { sbtAddress } = req.body;
            if (!sbtAddress) {
                res.status(400).json({ error: 'sbtAddress required' });
                return;
            }

            // Validate sbtAddress is a valid TON address
            let normalizedSbtAddress: string;
            try {
                normalizedSbtAddress = Address.parse(sbtAddress).toString({ testOnly: config.network === 'testnet', bounceable: true });
            } catch {
                res.status(400).json({ error: 'Invalid TON address for sbtAddress' });
                return;
            }

            // Limit blocklist size to prevent disk exhaustion
            if (blocklist.length >= 10000) {
                res.status(400).json({ error: 'Blocklist capacity reached' });
                return;
            }

            addToBlocklist(normalizedSbtAddress);

            // Invalidate passports cache
            passportsCache = null;

            res.json({ success: true, message: 'Passport blocked from explorer' });
        } catch (error: unknown) {
            console.error('Revoke error:', error instanceof Error ? error.message : 'unknown');
            res.status(500).json({ error: 'Block failed' });
        }
    });

    app.use((_req, res) => {
        res.status(404).json({ error: 'Not found' });
    });

    app.use((err: Error & { type?: string; status?: number; statusCode?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        console.error(`[${new Date().toISOString()}] Error:`, err.message);

        if (err.type === 'entity.parse.failed') {
            return res.status(400).json({ error: 'Invalid JSON in request body' });
        }

        if (err.type === 'entity.too.large') {
            return res.status(413).json({ error: 'Payload too large (max 10KB)' });
        }

        return res.status(500).json({ error: 'Internal server error' });
    });

    const API_PORT = 3001;
    app.listen(API_PORT, '127.0.0.1', () => {
        console.log(`Mint API running on http://127.0.0.1:${API_PORT}`);
        // Pre-warm cache in background so first request is instant
        setTimeout(() => {
            getAllPassports().catch(() => {});
        }, 3000);
    });

    return app;
}
