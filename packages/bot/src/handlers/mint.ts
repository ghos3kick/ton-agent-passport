import { Bot } from 'grammy';
import { BotContext } from '../context';
import { requireAdmin } from '../middleware/admin';

export function registerMintHandler(bot: Bot<BotContext>) {
    bot.command('mint', requireAdmin, async (ctx) => {
        await ctx.conversation.enter('mintFlow');
    });
}
