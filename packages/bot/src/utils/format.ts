import { AgentPassportData } from '@agent-passport/sdk';

export function formatPassportCard(passport: AgentPassportData): string {
    const status = passport.isActive ? '\u2705 Active' : '\u274c Revoked';
    const createdDate = passport.createdAt
        ? new Date(passport.createdAt * 1000).toISOString().split('T')[0]
        : 'Unknown';

    const shortAddr = shortenAddr(passport.address);
    const shortOwner = shortenAddr(passport.ownerAddress);

    return [
        '\ud83e\udd16 <b>Agent Passport</b> #' + passport.index,
        '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
        `\ud83d\udccd Address: <code>${shortAddr}</code>`,
        `\ud83d\udc64 Owner: <code>${shortOwner}</code>`,
        `\ud83e\udde0 Capabilities: ${escapeHtml(passport.capabilities || 'none')}`,
        `\ud83d\udd17 Endpoint: ${escapeHtml(passport.endpoint || 'none')}`,
        `\ud83d\udcca Transactions: ${passport.txCount}`,
        `\ud83d\udcc5 Created: ${createdDate}`,
        `Status: ${status}`,
        '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
        `Registry: <code>${shortenAddr(passport.collectionAddress)}</code>`,
    ].join('\n');
}

export function formatRegistryStats(
    totalPassports: number,
    registryAddress: string,
    network: string,
): string {
    return [
        '\ud83d\udcca <b>Agent Registry Stats</b>',
        '',
        `Total passports: <b>${totalPassports}</b>`,
        `Registry: <code>${shortenAddr(registryAddress)}</code>`,
        `Network: ${network}`,
    ].join('\n');
}

export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function shortenAddr(address: string, chars: number = 4): string {
    if (!address || address.length <= chars * 2 + 3) return address || 'unknown';
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
