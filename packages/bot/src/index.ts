import { createBot } from './bot';
import { createApiServer } from './api';
import { initDirectWallet } from './services/directWallet';
import { config } from './config';

async function main() {
    // Initialize direct wallet (mnemonic-based signing)
    await initDirectWallet();
    console.log('Direct wallet ready');

    const bot = createBot();

    // Start HTTP API server for auto-mint
    createApiServer();

    // Graceful shutdown
    const stop = () => {
        console.log('Shutting down...');
        bot.stop();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);

    // Set the menu button to open Mini App
    await bot.api.setChatMenuButton({
        menu_button: {
            type: 'web_app',
            text: 'Open Passport',
            web_app: { url: process.env.MINI_APP_URL || 'https://wallet-converter.ru/mini-app/' },
        },
    });
    console.log('Menu button set to Mini App');

    console.log('Agent Passport Bot is starting...');
    await bot.start();
}

main().catch(console.error);
