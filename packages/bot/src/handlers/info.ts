import { Bot, InlineKeyboard } from 'grammy';
import { BotContext } from '../context';

const MINI_APP_URL = process.env.MINI_APP_URL || 'https://wallet-converter.ru/mini-app/';

export function registerInfoHandler(bot: Bot<BotContext>) {
    bot.command('info', async (ctx) => {
        const keyboard = new InlineKeyboard()
            .webApp('\uD83E\uDEAA Open Mini App', MINI_APP_URL);

        await ctx.reply(
            [
                '\uD83E\uDEAA <b>Agent Passport</b>',
                '',
                'Soulbound Token (SBT) identity registry for AI agents on TON blockchain.',
                '',
                '\u2022 <b>Register</b> \u2014 mint a non-transferable passport for your agent',
                '\u2022 <b>Verify</b> \u2014 check any agent\'s identity and Trust Score',
                '\u2022 <b>Explore</b> \u2014 browse all registered agents',
                '',
                'Each passport stores owner, capabilities, API endpoint and on-chain reputation counter.',
                '',
                'TEP-62 \u00b7 TEP-85 \u00b7 TON Connect',
                '',
                '\ud83d\udd0d /verify <code>address</code> \u2014 check any agent\u2019s passport',
            ].join('\n'),
            { parse_mode: 'HTML', reply_markup: keyboard },
        );
    });
}
