import { NextFunction } from 'grammy';
import { BotContext } from '../context';

export function requireWallet() {
    return async (ctx: BotContext, next: NextFunction) => {
        if (!ctx.session.walletAddress) {
            await ctx.reply(
                'Сначала подключите кошелёк: /connect\n\nFirst, connect your wallet: /connect',
            );
            return;
        }
        await next();
    };
}
