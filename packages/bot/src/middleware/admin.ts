import { NextFunction } from 'grammy';
import { Address } from '@ton/core';
import { BotContext } from '../context';
import { config } from '../config';

function addressesEqual(a: string, b: string): boolean {
    try {
        const addrA = Address.parse(a);
        const addrB = Address.parse(b);
        return addrA.equals(addrB);
    } catch {
        return false;
    }
}

export async function requireAdmin(ctx: BotContext, next: NextFunction) {
    // Primary check: Telegram user ID (secure, cannot be spoofed)
    if (config.adminTelegramId) {
        if (ctx.from?.id !== config.adminTelegramId) {
            await ctx.reply('⛔ Only the admin can mint passports.');
            return;
        }
        await next();
        return;
    }

    // Fallback: wallet address check (legacy, less secure)
    const walletAddress = ctx.session.walletAddress;

    if (!walletAddress) {
        await ctx.reply('You need to connect your wallet first. Use /connect');
        return;
    }

    if (!config.adminAddress) {
        await ctx.reply('⛔ Admin not configured. Mint is disabled.');
        return;
    }

    if (!addressesEqual(walletAddress, config.adminAddress)) {
        await ctx.reply('⛔ Only the admin can mint passports.');
        return;
    }

    await next();
}
