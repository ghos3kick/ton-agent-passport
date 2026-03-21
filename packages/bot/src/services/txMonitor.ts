/**
 * Transaction Monitor — anti-abuse filters for TrustScore
 *
 * Watches agent wallet transactions via TonAPI and decides which ones
 * count toward txCount (IncrementTxCount). Tracks txVolume per agent.
 *
 * Filters:
 * 1. Dust filter: tx < 0.01 TON ignored
 * 2. Circular detection: A→agent→A within time window ignored
 * 3. Self-transfer: agent→agent ignored
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs';
import path from 'path';
import { Address } from '@ton/core';
import { config } from '../config';

// ===== Anti-Abuse Constants =====
export const ANTI_ABUSE_MIN_TX_VALUE = 10_000_000n; // 0.01 TON in nanoTON
export const CIRCULAR_WINDOW_SEC = 300; // 5 minutes — transfers A→agent + agent→A within this window are circular
export const MONITOR_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between scans

// Weighted scoring constants (exported for reputation.ts)
export const MAX_TX_COUNT = 100;
export const MAX_TX_VOLUME = 1000; // in TON
export const WEIGHT_COUNT = 0.4;
export const WEIGHT_VOLUME = 0.6;

// ===== Storage =====
const DATA_DIR = path.resolve(__dirname, '../../../../data');
const VOLUMES_FILE = path.join(DATA_DIR, 'agent-volumes.json');
const PROCESSED_FILE = path.join(DATA_DIR, 'processed-txs.json');

// { sbtAddress: volumeInTON }
let agentVolumes: Record<string, number> = {};
// Set of processed tx hashes to avoid double-counting
let processedTxHashes: string[] = [];
const MAX_PROCESSED_HASHES = 10_000; // Keep last N to avoid unbounded growth

function loadStorage() {
    try {
        mkdirSync(DATA_DIR, { recursive: true });
    } catch { /* exists */ }
    try {
        agentVolumes = JSON.parse(readFileSync(VOLUMES_FILE, 'utf-8'));
    } catch { agentVolumes = {}; }
    try {
        processedTxHashes = JSON.parse(readFileSync(PROCESSED_FILE, 'utf-8'));
    } catch { processedTxHashes = []; }
}

function atomicWriteSync(filePath: string, data: string) {
    const tmpPath = filePath + '.tmp';
    writeFileSync(tmpPath, data);
    renameSync(tmpPath, filePath);
}

function saveVolumes() {
    try {
        atomicWriteSync(VOLUMES_FILE, JSON.stringify(agentVolumes, null, 2));
    } catch (err) {
        console.error('[txMonitor] Failed to save volumes:', err instanceof Error ? err.message : 'unknown');
    }
}

function saveProcessed() {
    try {
        // Trim to last MAX_PROCESSED_HASHES
        if (processedTxHashes.length > MAX_PROCESSED_HASHES) {
            processedTxHashes = processedTxHashes.slice(-MAX_PROCESSED_HASHES);
        }
        atomicWriteSync(PROCESSED_FILE, JSON.stringify(processedTxHashes));
    } catch (err) {
        console.error('[txMonitor] Failed to save processed txs:', err instanceof Error ? err.message : 'unknown');
    }
}

export function getAgentVolume(sbtAddress: string): number {
    return agentVolumes[sbtAddress] || 0;
}

export function getAllVolumes(): Record<string, number> {
    return { ...agentVolumes };
}

// ===== Filtering Logic =====

interface TxInfo {
    hash: string;
    sender: string;    // raw address
    recipient: string; // raw address
    value: bigint;     // in nanoTON
    timestamp: number; // unix seconds
}

function normalizeAddr(addr: string): string {
    try {
        if (addr.startsWith('0:') || addr.startsWith('-1:')) {
            return Address.parseRaw(addr).toString({ testOnly: config.network === 'testnet', bounceable: true });
        }
        return Address.parse(addr).toString({ testOnly: config.network === 'testnet', bounceable: true });
    } catch {
        return addr;
    }
}

export interface FilterResult {
    valid: TxInfo[];
    dustRejected: number;
    circularRejected: number;
    selfRejected: number;
    alreadyProcessed: number;
}

/**
 * Filter transactions for a given agent. Applies all anti-abuse checks.
 *
 * @param agentOwner - normalized owner address of the agent
 * @param transactions - raw transactions to filter
 */
export function filterTransactions(agentOwner: string, transactions: TxInfo[]): FilterResult {
    const result: FilterResult = {
        valid: [],
        dustRejected: 0,
        circularRejected: 0,
        selfRejected: 0,
        alreadyProcessed: 0,
    };

    const processedSet = new Set(processedTxHashes);
    const normalizedOwner = normalizeAddr(agentOwner);

    // Build maps for circular detection:
    // Track incoming (to agent) and outgoing (from agent) by counterparty
    const incoming = new Map<string, { timestamp: number; hash: string }[]>(); // counterparty → [{ts, hash}]
    const outgoing = new Map<string, { timestamp: number; hash: string }[]>();

    // First pass: categorize transactions
    for (const tx of transactions) {
        if (processedSet.has(tx.hash)) {
            result.alreadyProcessed++;
            continue;
        }

        const sender = normalizeAddr(tx.sender);
        const recipient = normalizeAddr(tx.recipient);

        // Self-transfer: agent sends to itself
        if (sender === normalizedOwner && recipient === normalizedOwner) {
            result.selfRejected++;
            console.log(`[txMonitor] Self-transfer rejected: ${tx.hash} (${tx.value} nanoTON)`);
            processedTxHashes.push(tx.hash);
            continue;
        }

        // Dust filter
        if (tx.value < ANTI_ABUSE_MIN_TX_VALUE) {
            result.dustRejected++;
            console.log(`[txMonitor] Dust tx rejected: ${tx.hash} (${tx.value} nanoTON < ${ANTI_ABUSE_MIN_TX_VALUE})`);
            processedTxHashes.push(tx.hash);
            continue;
        }

        // Categorize for circular detection
        if (sender === normalizedOwner) {
            // Outgoing: agent → recipient
            const list = outgoing.get(recipient) || [];
            list.push({ timestamp: tx.timestamp, hash: tx.hash });
            outgoing.set(recipient, list);
        } else if (recipient === normalizedOwner) {
            // Incoming: sender → agent
            const list = incoming.get(sender) || [];
            list.push({ timestamp: tx.timestamp, hash: tx.hash });
            incoming.set(sender, list);
        }
    }

    // Second pass: detect circular transfers
    // Circular = same counterparty has both incoming AND outgoing within CIRCULAR_WINDOW_SEC
    const circularHashes = new Set<string>();

    for (const [counterparty, inList] of incoming) {
        const outList = outgoing.get(counterparty);
        if (!outList) continue;

        for (const inTx of inList) {
            for (const outTx of outList) {
                if (Math.abs(inTx.timestamp - outTx.timestamp) <= CIRCULAR_WINDOW_SEC) {
                    circularHashes.add(inTx.hash);
                    circularHashes.add(outTx.hash);
                }
            }
        }
    }

    // Third pass: collect valid transactions
    for (const tx of transactions) {
        if (processedSet.has(tx.hash)) continue;

        const sender = normalizeAddr(tx.sender);
        const recipient = normalizeAddr(tx.recipient);

        // Skip already-rejected (self, dust)
        if (sender === normalizedOwner && recipient === normalizedOwner) continue;
        if (tx.value < ANTI_ABUSE_MIN_TX_VALUE) continue;

        if (circularHashes.has(tx.hash)) {
            result.circularRejected++;
            console.log(`[txMonitor] Circular tx rejected: ${tx.hash} (${normalizedOwner} <-> counterparty within ${CIRCULAR_WINDOW_SEC}s)`);
            processedTxHashes.push(tx.hash);
            continue;
        }

        result.valid.push(tx);
        processedTxHashes.push(tx.hash);
    }

    return result;
}

// ===== TonAPI Transaction Fetching =====

interface TonApiTransaction {
    hash: string;
    utime: number;
    in_msg?: {
        source?: { address?: string };
        destination?: { address?: string };
        value?: number;
    };
    out_msgs?: Array<{
        source?: { address?: string };
        destination?: { address?: string };
        value?: number;
    }>;
}

async function fetchAgentTransactions(ownerAddress: string, limit = 50): Promise<TxInfo[]> {
    const BASE = config.network === 'testnet'
        ? 'https://testnet.tonapi.io/v2'
        : 'https://tonapi.io/v2';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.tonapiKey) headers['Authorization'] = `Bearer ${config.tonapiKey}`;

    const res = await fetch(
        `${BASE}/blockchain/accounts/${encodeURIComponent(ownerAddress)}/transactions?limit=${limit}`,
        { headers }
    );

    if (!res.ok) {
        console.error(`[txMonitor] TonAPI error for ${ownerAddress}: ${res.status}`);
        return [];
    }

    const data = await res.json() as { transactions?: TonApiTransaction[] };
    const txs: TxInfo[] = [];

    for (const tx of data.transactions || []) {
        // Process incoming message
        if (tx.in_msg?.value && tx.in_msg.source?.address) {
            txs.push({
                hash: tx.hash + ':in',
                sender: tx.in_msg.source.address,
                recipient: tx.in_msg.destination?.address || ownerAddress,
                value: BigInt(tx.in_msg.value),
                timestamp: tx.utime,
            });
        }

        // Process outgoing messages
        for (const out of tx.out_msgs || []) {
            if (out.value && out.destination?.address) {
                txs.push({
                    hash: tx.hash + ':out:' + (out.destination.address || ''),
                    sender: out.source?.address || ownerAddress,
                    recipient: out.destination.address,
                    value: BigInt(out.value),
                    timestamp: tx.utime,
                });
            }
        }
    }

    return txs;
}

// ===== Monitor Loop =====

interface AgentInfo {
    sbtAddress: string;
    ownerAddress: string;
    agentIndex: number;
}

let monitorInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Run one monitoring cycle for all known agents.
 * Fetches transactions, applies filters, updates volumes,
 * and returns increment commands (caller decides whether to send on-chain).
 */
export async function monitorCycle(agents: AgentInfo[]): Promise<{
    increments: { agentIndex: number; sbtAddress: string; count: number }[];
    stats: { total: number; valid: number; dust: number; circular: number; self: number };
}> {
    const stats = { total: 0, valid: 0, dust: 0, circular: 0, self: 0 };
    const increments: { agentIndex: number; sbtAddress: string; count: number }[] = [];

    for (const agent of agents) {
        try {
            const txs = await fetchAgentTransactions(agent.ownerAddress);
            stats.total += txs.length;

            const filtered = filterTransactions(agent.ownerAddress, txs);
            stats.valid += filtered.valid.length;
            stats.dust += filtered.dustRejected;
            stats.circular += filtered.circularRejected;
            stats.self += filtered.selfRejected;

            if (filtered.valid.length > 0) {
                // Update volume
                const volumeTON = filtered.valid.reduce(
                    (sum, tx) => sum + Number(tx.value) / 1_000_000_000,
                    0
                );
                agentVolumes[agent.sbtAddress] = (agentVolumes[agent.sbtAddress] || 0) + volumeTON;

                increments.push({
                    agentIndex: agent.agentIndex,
                    sbtAddress: agent.sbtAddress,
                    count: filtered.valid.length,
                });

                console.log(`[txMonitor] ${agent.sbtAddress}: +${filtered.valid.length} valid txs, +${volumeTON.toFixed(4)} TON volume`);
            }
        } catch (err) {
            console.error(`[txMonitor] Error monitoring ${agent.sbtAddress}:`, err instanceof Error ? err.message : err);
        }
    }

    // Persist
    saveVolumes();
    saveProcessed();

    return { increments, stats };
}

/**
 * Start the background monitor loop.
 * Requires a function to get current agent list (from passports cache).
 */
export function startMonitor(getAgents: () => Promise<AgentInfo[]>) {
    loadStorage();
    console.log(`[txMonitor] Started. Interval: ${MONITOR_INTERVAL_MS / 1000}s, dust threshold: ${ANTI_ABUSE_MIN_TX_VALUE} nanoTON`);

    const run = async () => {
        try {
            const agents = await getAgents();
            if (agents.length === 0) return;

            const { stats } = await monitorCycle(agents);
            console.log(`[txMonitor] Cycle done: ${stats.total} total, ${stats.valid} valid, ${stats.dust} dust, ${stats.circular} circular, ${stats.self} self-transfer`);
        } catch (err) {
            console.error('[txMonitor] Cycle error:', err instanceof Error ? err.message : err);
        }
    };

    // First run after 30s (let caches warm up)
    setTimeout(run, 30_000);
    monitorInterval = setInterval(run, MONITOR_INTERVAL_MS);
}

export function stopMonitor() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
    }
}

// Export storage loader for API use
export function loadVolumes() {
    loadStorage();
}
