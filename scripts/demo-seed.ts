/**
 * Demo Seed Script — mints 5 realistic AI agent passports
 * Usage: npx tsx scripts/demo-seed.ts
 *
 * Requires: bot API running on localhost:3001 with admin wallet connected
 */

const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

interface DemoAgent {
  name: string;
  owner: string;
  endpoint: string;
  capabilities: string;
  metadata: string;
}

// These are valid base64 TON addresses (testnet format)
const DEMO_AGENTS: DemoAgent[] = [
  {
    name: 'Atlas AI',
    owner: '0QCJabQmoGktd9j7guB8idsbxgzX71Noj4sF6ged7FDwqx6x',
    endpoint: 'https://api.atlas-agent.ai/v1',
    capabilities: 'chat,reasoning,code-generation,analysis',
    metadata: 'https://raw.githubusercontent.com/ghos3kick/ton-agent-passport/main/docs/demo/atlas.json',
  },
  {
    name: 'Nexus Trading Bot',
    owner: '0QCXYHT7m0WKGszuLCm6uHhU8EcKWcjJyVOWM20dR4P75xdO',
    endpoint: 'https://trading.nexus-bot.io/api',
    capabilities: 'trading,market-analysis,portfolio',
    metadata: 'https://raw.githubusercontent.com/ghos3kick/ton-agent-passport/main/docs/demo/nexus.json',
  },
  {
    name: 'Sentinel Guard',
    owner: '0QDBQLURr1TxpyDbZBVmgQAgTVXyLbQqRtV4PFSWy9b2C0F-',
    endpoint: 'https://sentinel.guard.network/v2',
    capabilities: 'security-audit,monitoring,threat-detection',
    metadata: 'https://raw.githubusercontent.com/ghos3kick/ton-agent-passport/main/docs/demo/sentinel.json',
  },
  {
    name: 'DataStream Oracle',
    owner: '0QCwSxv5pwneGLwxW2IK-cel3UsAkJ6YOcAc8l3hcDt2nzqF',
    endpoint: 'https://oracle.datastream.xyz/query',
    capabilities: 'data-aggregation,oracle,analytics',
    metadata: 'https://raw.githubusercontent.com/ghos3kick/ton-agent-passport/main/docs/demo/oracle.json',
  },
  {
    name: 'Muse Creative AI',
    owner: '0QC6IRAX8N8izg2uwmQ7FhIaASg2VUu8gk0fsdLGe3GHsTrS',
    endpoint: 'https://creative.muse-ai.studio/generate',
    capabilities: 'image-generation,creative,nft-art',
    metadata: 'https://raw.githubusercontent.com/ghos3kick/ton-agent-passport/main/docs/demo/muse.json',
  },
  {
    name: 'Forge Builder',
    owner: '0QBm5KS14ELLIo-aTvIpaHemuSScFsi4iwq5GmzAxgmeO42e',
    endpoint: 'https://forge.builder-agent.dev/v1',
    capabilities: 'smart-contract-audit,deployment,testing',
    metadata: 'https://raw.githubusercontent.com/ghos3kick/ton-agent-passport/main/docs/demo/forge.json',
  },
];

async function mintAgent(agent: DemoAgent, index: number): Promise<boolean> {
  console.log(`\n[${index + 1}/${DEMO_AGENTS.length}] Minting: ${agent.endpoint}...`);
  console.log(`  Owner: ${agent.owner}`);
  console.log(`  Caps:  ${agent.capabilities}`);

  try {
    const res = await fetch(`${API_URL}/api/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-API-Key': ADMIN_API_KEY,
      },
      body: JSON.stringify(agent),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      console.log(`  ✅ Success! TX: ${data.txHash || 'pending'}`);
      return true;
    } else {
      console.log(`  ❌ Failed: ${data.error || JSON.stringify(data)}`);
      return false;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  ❌ Error: ${message}`);
    return false;
  }
}

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/health`);
    const data = await res.json();
    if (!res.ok || data.status !== 'ok') {
      console.error('❌ API not healthy:', data);
      return false;
    }
    // Health endpoint returns minimal info — wallet readiness is checked by mint itself
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ API not available at', API_URL, '-', message);
    return false;
  }
}

async function main() {
  console.log('🪪 Agent Passport — Demo Seed');
  console.log('================================');
  console.log(`API: ${API_URL}`);
  console.log(`Agents to mint: ${DEMO_AGENTS.length}\n`);

  // Health check
  console.log('Checking API health...');
  const healthy = await checkHealth();
  if (!healthy) {
    console.log('\nMake sure:');
    console.log('1. Bot is running (pm2 status)');
    console.log('2. MNEMONIC is set in packages/bot/.env');
    process.exit(1);
  }
  console.log('✅ API is healthy, wallet ready\n');

  let success = 0;
  let failed = 0;

  for (let i = 0; i < DEMO_AGENTS.length; i++) {
    const ok = await mintAgent(DEMO_AGENTS[i], i);
    if (ok) success++;
    else failed++;

    // Wait between mints — toncenter free tier has strict rate limits
    if (i < DEMO_AGENTS.length - 1) {
      console.log(`\n  ⏳ Waiting 30s for blockchain + rate limit...`);
      await new Promise(r => setTimeout(r, 30_000));
    }
  }

  console.log('\n================================');
  console.log(`🎉 Demo seed complete! ${success} minted, ${failed} failed.`);
  console.log('\nNext steps:');
  console.log('1. Open Mini App → Home → should show updated passport count');
  console.log('2. Search by any owner address');
  console.log('3. Verify any address → should show Verified + Trust Score');
}

main().catch(console.error);
