export const REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? 'EQDRdykyEDAj9GgM3sPnkj9Y-OM6IG3wX_QmI40emh2HBxZS';
export const TONAPI_BASE_URL = '/tonapi';
export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK ?? 'testnet') as 'mainnet' | 'testnet';
export const TONCONNECT_MANIFEST_URL =
  process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL ??
  'https://wallet-converter.ru/tonconnect-manifest.json';
export const EXPLORER_BASE =
  NETWORK === 'testnet' ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com';
