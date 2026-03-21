import { Bot, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { limit } from '@grammyjs/ratelimiter';
import { BotContext, BaseContext, SessionData } from './context';
import { config } from './config';
import { logMiddleware } from './middleware/logging';
import { registerStartHandler } from './handlers/start';
import { registerInfoHandler } from './handlers/info';
import { registerMintHandler } from './handlers/mint';
import { registerVerifyHandler } from './handlers/verify';
import { mintConversation } from './conversations/mintFlow';

export function createBot(): Bot<BotContext> {
    const bot = new Bot<BotContext>(config.botToken);

    // Rate limiter — max 3 messages per second per user
    bot.use(limit({
        timeFrame: 1000,
        limit: 3,
        onLimitExceeded: async (ctx) => {
            await ctx.reply('⏳ Too many requests. Please wait a moment.');
        },
    }));

    // Session middleware (must come before conversations)
    bot.use(
        session<SessionData, BotContext>({
            initial: () => ({}),
        }),
    );

    // Conversations middleware (must come after session)
    bot.use(conversations<BaseContext, BaseContext>());

    // Register conversation handlers
    bot.use(createConversation<BaseContext, BaseContext>(mintConversation, 'mintFlow'));

    // Logging middleware
    bot.use(logMiddleware);

    // Register command handlers
    registerStartHandler(bot);
    registerInfoHandler(bot);
    registerMintHandler(bot);
    registerVerifyHandler(bot);

    // Error handler
    bot.catch((err) => {
        console.error('Bot error:', err.message);
    });

    return bot;
}
