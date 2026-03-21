/**
 * Example: Verify an AI agent's passport before interaction
 *
 * This demonstrates how any service can check an agent's identity,
 * capabilities, and trust score using the Agent Passport SDK.
 *
 * Usage: npx tsx examples/verify-agent.ts <agent-address>
 */

import { AgentPassportSDK, isValidTonAddress, shortenAddress } from '../packages/sdk/src';

const REGISTRY_ADDRESS = 'kQBI0vbuDJiN3pOKPKpCcT1mcZUzFHDkfH9astwv018XoFdz';

interface TrustScore {
    total: number;
    level: string;
}

function calculateTrustScore(data: {
    capabilities: string;
    txCount: number;
    createdAt: number;
    revokedAt: number;
}): TrustScore {
    if (data.revokedAt > 0) {
        return { total: 0, level: 'revoked' };
    }

    const existence = 10;

    const capCount = data.capabilities
        ? data.capabilities.split(',').filter(c => c.trim()).length
        : 0;
    const capabilities = Math.min(10, capCount * 2);

    const activity = Math.min(50, (data.txCount || 0) * 5);

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

    return { total, level };
}

async function main() {
    const address = process.argv[2];

    if (!address) {
        console.error('Usage: npx tsx examples/verify-agent.ts <agent-address>');
        console.error('Example: npx tsx examples/verify-agent.ts kQCJabQmoGktd9j7guB8idsbxgzX71Noj4sF6ged7FDwq0N0');
        process.exit(1);
    }

    if (!isValidTonAddress(address)) {
        console.error(`\n\u26a0\ufe0f  Invalid TON address: ${address}`);
        process.exit(1);
    }

    const sdk = new AgentPassportSDK({
        registryAddress: REGISTRY_ADDRESS,
        network: 'testnet',
    });

    console.log(`\n\ud83d\udd0d Verifying agent: ${shortenAddress(address)}\n`);

    const passports = await sdk.getPassportsByOwner(address);

    if (passports.length === 0) {
        console.log('\u274c No passport found for this address');
        console.log('\u2192 Decision: REJECTED');
        process.exit(0);
    }

    const passport = passports[0];

    let name = 'Unknown';
    try {
        const metadata = await sdk.getPassportMetadata(passport.address);
        name = metadata.name || 'Unknown';
    } catch {
        // metadata fetch failed — use fallback
    }

    const score = calculateTrustScore({
        capabilities: passport.capabilities,
        txCount: passport.txCount,
        createdAt: passport.createdAt,
        revokedAt: passport.revokedAt,
    });

    const createdDate = passport.createdAt > 0
        ? new Date(passport.createdAt * 1000).toISOString().split('T')[0]
        : 'Unknown';

    const status = passport.isActive ? 'Active' : 'Revoked';

    console.log(`\u2705 Passport found`);
    console.log(`   Name: ${name}`);
    console.log(`   Capabilities: ${passport.capabilities}`);
    console.log(`   Trust Score: ${score.total}/100 (${score.level})`);
    console.log(`   Active since: ${createdDate}`);
    console.log(`   Status: ${status}`);
    console.log(`   Transactions: ${passport.txCount}`);

    let decision: string;
    if (!passport.isActive) {
        decision = 'REJECTED';
    } else if (score.total >= 40) {
        decision = 'TRUSTED';
    } else if (score.total >= 20) {
        decision = 'CAUTION';
    } else {
        decision = 'REJECTED';
    }

    console.log(`\n\u2192 Decision: ${decision}`);
}

main().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
