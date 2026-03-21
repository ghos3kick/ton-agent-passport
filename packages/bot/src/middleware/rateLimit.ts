const mintCooldowns = new Map<string, number>();
const COOLDOWN_MS = 60_000; // 1 minute between mints

// Periodic cleanup to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [id, ts] of mintCooldowns) {
        if (now - ts >= COOLDOWN_MS) mintCooldowns.delete(id);
    }
}, 60_000);

export function checkMintRateLimit(identifier: string): boolean {
    const lastMint = mintCooldowns.get(identifier);
    if (lastMint && Date.now() - lastMint < COOLDOWN_MS) {
        return false;
    }
    mintCooldowns.set(identifier, Date.now());
    return true;
}
