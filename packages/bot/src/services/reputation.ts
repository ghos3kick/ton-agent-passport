export interface PassportInput {
    owner: string;
    endpoint: string;
    capabilities: string;
    txCount: number;
    createdAt: number;
    revokedAt: number;
    txVolume?: number; // cumulative transaction volume in TON (off-chain tracked)
}

export interface TrustScore {
    total: number;
    level: string;
    breakdown: {
        existence: number;
        activity: number;
        age: number;
        capabilities: number;
    };
}

export function calculateTrustScore(data: PassportInput): TrustScore {
    if (data.revokedAt > 0) {
        return {
            total: 0,
            level: 'revoked',
            breakdown: { existence: 0, activity: 0, age: 0, capabilities: 0 },
        };
    }

    // Self-declared data (low weight — can be gamed)
    const existence = 10;

    const capCount = data.capabilities
        ? data.capabilities.split(',').filter(c => c.trim()).length
        : 0;
    const capabilities = Math.min(10, capCount * 2);

    // On-chain verifiable data (high weight — requires real activity/time)
    // Weighted scoring: 40% count + 60% volume (with log scaling)
    const txCount = data.txCount || 0;
    const txVolume = data.txVolume || 0;
    const MAX_TX_COUNT = 100;
    const MAX_TX_VOLUME = 1000; // TON

    const countScore = Math.min(txCount / MAX_TX_COUNT, 1.0);
    const volumeScore = txVolume > 0
        ? Math.min(Math.log10(1 + txVolume) / Math.log10(1 + MAX_TX_VOLUME), 1.0)
        : 0;

    // If no volume data tracked yet, fall back to count-only (backwards compatible)
    const activity = txVolume > 0
        ? Math.round((countScore * 0.4 + volumeScore * 0.6) * 50)
        : Math.min(50, txCount * 5);

    let age = 0;
    if (data.createdAt > 0) {
        const daysSinceCreation = Math.floor((Date.now() / 1000 - data.createdAt) / 86400);
        age = Math.min(30, Math.max(0, daysSinceCreation));
    }

    const total = Math.min(100, existence + activity + age + capabilities);

    let level: string;
    if (total >= 80) level = 'elite';
    else if (total >= 60) level = 'verified';
    else if (total >= 40) level = 'trusted';
    else if (total > 0) level = 'new';
    else level = 'none';

    return {
        total,
        level,
        breakdown: { existence, activity, age, capabilities },
    };
}
