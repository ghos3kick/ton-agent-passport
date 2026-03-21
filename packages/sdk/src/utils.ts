import { Address } from '@ton/core';

export function normalizeAddress(address: string): string {
    try {
        return Address.parse(address).toString();
    } catch {
        return address;
    }
}

export function isValidTonAddress(address: string): boolean {
    try {
        Address.parse(address);
        return true;
    } catch {
        return false;
    }
}

export function shortenAddress(address: string, chars: number = 4): string {
    if (address.length <= chars * 2 + 3) return address;
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
