import 'dotenv/config';

export const config = {
    botToken: process.env.BOT_TOKEN!,
    tonapiKey: process.env.TONAPI_KEY ?? '',
    registryAddress: process.env.REGISTRY_ADDRESS!,
    network: (process.env.NETWORK || 'testnet') as 'mainnet' | 'testnet',
    tonconnectManifestUrl: process.env.TONCONNECT_MANIFEST_URL ?? '',
    adminAddress: process.env.ADMIN_ADDRESS ?? '',
    adminApiKey: process.env.ADMIN_API_KEY ?? '',
    adminTelegramId: process.env.ADMIN_TELEGRAM_ID ? Number(process.env.ADMIN_TELEGRAM_ID) : undefined,
};
