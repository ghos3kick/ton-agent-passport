import { Api } from 'tonapi-sdk-js';
import { RegistryInfo, RegistryError } from './types';

export async function fetchRegistryInfo(
    api: Api<unknown>,
    registryAddress: string,
): Promise<RegistryInfo> {
    try {
        const result = await api.blockchain.execGetMethodForBlockchainAccount(
            registryAddress,
            'get_collection_data',
        );

        if (!result.success) {
            throw new RegistryError('Failed to call get_collection_data');
        }

        const stack = result.stack;
        // get_collection_data returns: nextItemIndex (int), content (cell), owner (slice)
        const nextItemIndex = Number(parseNumFromStack(stack[0]));
        // stack[1] is content cell — skip
        const ownerAddress = parseAddressFromStack(stack[2]);

        return {
            address: registryAddress,
            ownerAddress,
            nextItemIndex,
        };
    } catch (e) {
        if (e instanceof RegistryError) throw e;
        throw new RegistryError(`Failed to get registry info: ${(e as Error).message}`);
    }
}

export async function fetchTotalPassports(
    api: Api<unknown>,
    registryAddress: string,
): Promise<number> {
    try {
        const result = await api.blockchain.execGetMethodForBlockchainAccount(
            registryAddress,
            'get_agent_count',
        );

        if (!result.success) {
            throw new RegistryError('Failed to call get_agent_count');
        }

        return Number(parseNumFromStack(result.stack[0]));
    } catch (e) {
        if (e instanceof RegistryError) throw e;
        throw new RegistryError(`Failed to get total passports: ${(e as Error).message}`);
    }
}

export async function fetchPassportAddressByIndex(
    api: Api<unknown>,
    registryAddress: string,
    index: number,
): Promise<string> {
    try {
        const result = await api.blockchain.execGetMethodForBlockchainAccount(
            registryAddress,
            'get_nft_address_by_index',
            { args: [index.toString()] },
        );

        if (!result.success) {
            throw new RegistryError(`Failed to call get_nft_address_by_index for index ${index}`);
        }

        return parseAddressFromStack(result.stack[0]);
    } catch (e) {
        if (e instanceof RegistryError) throw e;
        throw new RegistryError(`Failed to get passport address: ${(e as Error).message}`);
    }
}

// --- Stack parsing helpers ---

export function parseNumFromStack(record: { type: string; num?: string }): bigint {
    if (record.type === 'num' && record.num !== undefined) {
        return BigInt(record.num);
    }
    throw new RegistryError(`Expected num on stack, got ${record.type}`);
}

export function parseAddressFromStack(record: {
    type: string;
    cell?: string;
    slice?: string;
    num?: string;
}): string {
    // TonAPI returns addresses in the "slice" field as raw address
    if (record.type === 'cell' && record.cell) {
        return record.cell;
    }
    if (record.type === 'slice' && record.slice) {
        return record.slice;
    }
    // Sometimes returned as num (raw int address)
    if (record.type === 'num' && record.num) {
        return record.num;
    }
    throw new RegistryError(`Expected address on stack, got ${record.type}`);
}

