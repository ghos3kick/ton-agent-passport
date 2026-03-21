import { Api } from 'tonapi-sdk-js';
import {
    AgentPassportData,
    AgentPassportMetadata,
    PassportNotFoundError,
    RegistryError,
} from './types';

export async function fetchPassportByAddress(
    api: Api<unknown>,
    passportAddress: string,
    registryAddress?: string,
): Promise<AgentPassportData> {
    try {
        // Get standard NFT data
        const nftItem = await api.nft.getNftItemByAddress(passportAddress);

        // Verify SBT belongs to the official registry
        if (registryAddress && nftItem.collection?.address !== registryAddress) {
            throw new Error(`SBT ${passportAddress} not from official registry`);
        }

        // Get custom passport data via get_passport_data
        const passportResult = await api.blockchain.execGetMethodForBlockchainAccount(
            passportAddress,
            'get_passport_data',
        );

        if (!passportResult.success) {
            throw new PassportNotFoundError(passportAddress);
        }

        // get_passport_data returns PassportData struct as decoded or stack
        // The decoded field may contain the struct if TonAPI can decode it
        const decoded = passportResult.decoded;
        let capabilities = '';
        let endpoint = '';
        let metadataUrl = '';
        let createdAt = 0;
        let txCount = 0;
        let revokedAt = 0;
        let ownerAddress = nftItem.owner?.address ?? '';

        if (decoded && typeof decoded === 'object') {
            // TonAPI may decode Tact structs automatically
            capabilities = decoded.capabilities ?? '';
            endpoint = decoded.endpoint ?? '';
            metadataUrl = decoded.metadataUrl ?? decoded.metadata_url ?? '';
            createdAt = parseInt(String(decoded.createdAt ?? decoded.created_at ?? 0), 10);
            txCount = parseInt(String(decoded.txCount ?? decoded.tx_count ?? 0), 10);
            revokedAt = parseInt(String(decoded.revokedAt ?? decoded.revoked_at ?? 0), 10);
            if (decoded.owner) ownerAddress = decoded.owner;
        } else {
            // Fallback: parse from stack
            const stack = passportResult.stack;
            if (stack.length >= 7) {
                // Stack order: owner, capabilities, endpoint, metadataUrl, createdAt, txCount, revokedAt
                ownerAddress = parseStackValue(stack[0]) || ownerAddress;
                capabilities = parseStackValue(stack[1]);
                endpoint = parseStackValue(stack[2]);
                metadataUrl = parseStackValue(stack[3]);
                createdAt = parseInt(stack[4]?.num ?? '0', 10);
                txCount = parseInt(stack[5]?.num ?? '0', 10);
                revokedAt = parseInt(stack[6]?.num ?? '0', 10);
            }
        }

        // Get authority address
        let authorityAddress = '';
        try {
            const authorityResult = await api.blockchain.execGetMethodForBlockchainAccount(
                passportAddress,
                'get_authority_address',
            );
            if (authorityResult.success && authorityResult.stack.length > 0) {
                authorityAddress = parseStackValue(authorityResult.stack[0]);
            }
        } catch {
            // authority address is optional for display purposes
        }

        return {
            address: passportAddress,
            index: nftItem.index,
            ownerAddress,
            collectionAddress: nftItem.collection?.address ?? '',
            capabilities,
            endpoint,
            metadataUrl,
            txCount,
            createdAt,
            authorityAddress,
            revokedAt,
            isActive: revokedAt === 0,
        };
    } catch (e) {
        if (e instanceof PassportNotFoundError) throw e;
        throw new PassportNotFoundError(passportAddress);
    }
}

export async function fetchPassportMetadata(
    api: Api<unknown>,
    passportAddress: string,
    registryAddress?: string,
): Promise<AgentPassportMetadata> {
    const passport = await fetchPassportByAddress(api, passportAddress, registryAddress);

    if (!passport.metadataUrl) {
        throw new RegistryError('Passport has no metadata URL');
    }

    // SSRF protection — only allow http/https
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(passport.metadataUrl);
    } catch {
        throw new RegistryError('Invalid metadata URL');
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new RegistryError('Metadata URL must use http or https');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
        const response = await fetch(passport.metadataUrl, { signal: controller.signal });
        if (!response.ok) {
            throw new RegistryError(`Failed to fetch metadata: ${response.status}`);
        }
        return (await response.json()) as AgentPassportMetadata;
    } finally {
        clearTimeout(timeout);
    }
}

function parseStackValue(record: { type: string; num?: string; cell?: string; slice?: string }): string {
    if (record.type === 'slice' && record.slice) return record.slice;
    if (record.type === 'cell' && record.cell) return record.cell;
    if (record.type === 'num' && record.num) return record.num;
    return '';
}
