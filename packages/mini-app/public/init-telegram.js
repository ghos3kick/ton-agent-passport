globalThis.Buffer = BufferModule.Buffer;
globalThis.process = globalThis.process || { env: {} };
// Signal Telegram immediately so it doesn't show gray screen
if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    if (typeof window.Telegram.WebApp.disableVerticalSwipes === 'function') {
        window.Telegram.WebApp.disableVerticalSwipes();
    }
}
