import { NextFunction } from 'grammy';
import { BotContext } from '../context';

function redactAddresses(text: string): string {
    // Redact TON addresses (EQ/UQ/kQ/0: prefix patterns)
    return text.replace(/([EUk]Q[A-Za-z0-9_-]{46})/g, (match) => `${match.slice(0, 6)}...${match.slice(-4)}`);
}

export async function logMiddleware(ctx: BotContext, next: NextFunction) {
    const start = Date.now();
    const user = ctx.from?.id;
    const rawText = ctx.message?.text || 'callback';
    const safeText = redactAddresses(rawText);
    console.log(`[${new Date().toISOString()}] ${user}: ${safeText}`);
    await next();
    console.log(`[${new Date().toISOString()}] Response: ${Date.now() - start}ms`);
}
