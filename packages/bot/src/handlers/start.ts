import { Bot, InlineKeyboard } from 'grammy';
import { BotContext } from '../context';

const MINI_APP_URL = process.env.MINI_APP_URL || 'https://wallet-converter.ru/mini-app/';

export function registerStartHandler(bot: Bot<BotContext>) {
    bot.command('start', async (ctx) => {
        const keyboard = new InlineKeyboard()
            .webApp('\uD83E\uDEAA Open Mini App', MINI_APP_URL);

        await ctx.reply(
            [
                '\uD83E\uDEAA <b>Agent Passport</b>',
                '',
                'On-chain identity for AI agents on TON.',
                'Mint, verify and explore agent passports in the Mini App.',
                '',
                '/verify <code>address</code> \u2014 check agent passport by TON address',
                '/info \u2014 learn more about the project',
            ].join('\n'),
            { parse_mode: 'HTML', reply_markup: keyboard },
        );
    });
}
