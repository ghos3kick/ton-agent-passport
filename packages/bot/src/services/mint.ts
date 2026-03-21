import { beginCell, Address, toNano, Cell } from '@ton/core';
import { sendTransaction } from './directWallet';

// MintPassport opcode from compiled Tact contract
const MINT_PASSPORT_OPCODE = 3867318038;

export interface MintParams {
    queryId: bigint;
    owner: Address;
    capabilities: string;
    endpoint: string;
    metadataUrl: string;
}

export function buildMintBody(params: MintParams): Cell {
    // Matches storeMintPassport from Tact build output:
    // storeUint(opcode, 32) + storeUint(queryId, 64) + storeAddress(owner)
    // + storeStringRefTail(capabilities) + storeStringRefTail(endpoint) + storeStringRefTail(metadataUrl)
    return beginCell()
        .storeUint(MINT_PASSPORT_OPCODE, 32)
        .storeUint(params.queryId, 64)
        .storeAddress(params.owner)
        .storeStringRefTail(params.capabilities)
        .storeStringRefTail(params.endpoint)
        .storeStringRefTail(params.metadataUrl)
        .endCell();
}

export async function sendMintTransaction(
    registryAddress: string,
    mintBody: Cell,
): Promise<string> {
    const result = await sendTransaction({
        to: registryAddress,
        value: toNano('0.2'),
        body: mintBody,
    });
    return result;
}
