import { beginCell, Address, toNano, Cell } from '@ton/core';

export const REGISTRY_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS;
// TONAPI key removed from client — proxied through nginx
export const NETWORK = import.meta.env.VITE_NETWORK || 'testnet';
export const TONCONNECT_MANIFEST_URL = import.meta.env.VITE_TONCONNECT_MANIFEST_URL;

export const TONAPI_BASE_URL =
  '/tonapi';  // Proxied through nginx

export const TONSCAN_BASE_URL =
  NETWORK === 'mainnet' ? 'https://tonscan.org' : 'https://testnet.tonscan.org';

const PUBLIC_MINT_PASSPORT_OPCODE = 534822672;

export interface MintParams {
  owner: Address;
  capabilities: string;
  endpoint: string;
  metadataUrl: string;
}

export function buildPublicMintBody(params: MintParams): Cell {
  return beginCell()
    .storeUint(PUBLIC_MINT_PASSPORT_OPCODE, 32)
    .storeAddress(params.owner)
    .storeStringRefTail(params.endpoint)
    .storeStringRefTail(params.capabilities)
    .storeStringRefTail(params.metadataUrl)
    .endCell();
}

export function buildPublicMintTransaction(mintBody: Cell) {
  return {
    validUntil: Math.floor(Date.now() / 1000) + 300,
    messages: [
      {
        address: REGISTRY_ADDRESS,
        amount: toNano('0.12').toString(), // 0.05 fee + 0.06 gas + buffer
        payload: mintBody.toBoc().toString('base64'),
      },
    ],
  };
}
