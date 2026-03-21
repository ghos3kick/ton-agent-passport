import { Bot, InlineKeyboard } from 'grammy';
import { BotContext } from '../context';
import { isValidTonAddress } from '@agent-passport/sdk';

const MINI_APP_URL = process.env.MINI_APP_URL || 'https://wallet-converter.ru/mini-app/';
const API_BASE = 'http://127.0.0.1:3001';

function trustBar(score: number): string {
    const filled = Math.round(score / 10);
    const empty = 10 - filled;
    return '\u2588'.repeat(filled) + '\u2591'.repeat(empty) + ` ${score}/100`;
}

interface ReputationResponse {
    found: boolean;
    address?: string;
    score: number;
    level: string;
    breakdown?: { existence: number; activity: number; age: number; capabilities: number };
    passport?: {
        owner: string;
        endpoint: string;
        capabilities: string;
        txCount: number;
        createdAt: number;
        revokedAt: number;
        isActive: boolean;
    };
    message?: string;
}

interface AgentNameResponse {
    name: string | null;
}

export function registerVerifyHandler(bot: Bot<BotContext>) {
    bot.command('verify', async (ctx) => {
        const address = ctx.match?.trim();

        if (!address) {
            await ctx.reply(
                '\ud83d\udd0d <b>Verify Agent Passport</b>\n\n'
                + 'Send an agent\u2019s TON address to check its passport.\n\n'
                + 'Example:\n<code>/verify kQCJabQmoGktd9j7guB8idsbxgzX71Noj4sF6ged7FDwq0N0</code>',
                { parse_mode: 'HTML' },
            );
            return;
        }

        if (!isValidTonAddress(address)) {
            await ctx.reply(
                '\u26a0\ufe0f Invalid TON address. Please send a valid address.\n'
                + 'Example: <code>/verify EQBx7...</code>',
                { parse_mode: 'HTML' },
            );
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/reputation/${encodeURIComponent(address)}`);
            const data: ReputationResponse = await res.json();

            if (!data.found || !data.passport) {
                await ctx.reply(
                    '\u274c <b>No passport found for this address</b>\n\n'
                    + 'The agent has no registered passport in the registry.',
                    { parse_mode: 'HTML' },
                );
                return;
            }

            const passport = data.passport;

            // Try to get agent name
            let name = address.slice(0, 8) + '...';
            try {
                const nameRes = await fetch(`${API_BASE}/api/agent-name/${encodeURIComponent(address)}`);
                const nameData: AgentNameResponse = await nameRes.json();
                if (nameData.name) name = nameData.name;
            } catch {
                // name unavailable
            }

            const createdDate = passport.createdAt > 0
                ? new Date(passport.createdAt * 1000).toISOString().split('T')[0]
                : 'Unknown';

            const status = passport.isActive ? 'Active' : 'Revoked';

            const keyboard = new InlineKeyboard()
                .webApp('\ud83d\udcf1 Open in Mini App', MINI_APP_URL);

            await ctx.reply(
                [
                    `\u2705 <b>Agent Verified</b>`,
                    '\u2501'.repeat(18),
                    `Name: ${name}`,
                    `Trust: <code>${trustBar(data.score)}</code>`,
                    `Capabilities: ${passport.capabilities}`,
                    `Active since: ${createdDate}`,
                    `Status: ${status}`,
                    `Transactions: ${passport.txCount}`,
                ].join('\n'),
                { parse_mode: 'HTML', reply_markup: keyboard },
            );
        } catch (err) {
            console.error('verify command error:', err);
            await ctx.reply('\u26a0\ufe0f Failed to verify passport. Please try again later.');
        }
    });
}
