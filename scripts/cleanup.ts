/**
 * Passport Cleanup Script — blocks passports from explorer via admin API
 * Usage: npx tsx scripts/cleanup.ts
 *
 * Uses server-side blocklist (on-chain revoke requires Registry contract upgrade).
 * Requires: bot API running on localhost:3001 with admin API key.
 */

const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
if (!ADMIN_API_KEY) {
  console.error('ADMIN_API_KEY environment variable is required');
  process.exit(1);
}

// ===== FILL IN: SBT addresses of passports to block =====
const PASSPORTS_TO_BLOCK: string[] = [
  // Example: '0:0e756339edf73daeba173ce5532b4f888b1a40317817acf36cc5d25ef3d8d253'
];

async function listPassports() {
  console.log('Fetching current passports...\n');
  const res = await fetch(`${API_URL}/api/passports?limit=50`);
  const data = await res.json();

  if (!data.passports || data.passports.length === 0) {
    console.log('No passports found.');
    return;
  }

  console.log(`Total on-chain: ${data.total}, Active (visible): ${data.passports.length}\n`);
  for (const p of data.passports) {
    const name = p.name || 'Unknown';
    const caps = p.capabilities || '';
    const owner = (p.owner || '').slice(0, 12);
    const score = p.trustScore?.total ?? 0;
    console.log(`#${p.index} | ${name.padEnd(20)} | owner: ${owner}... | caps: ${caps.slice(0, 30)} | score: ${score} | sbt: ${p.address}`);
  }
}

async function blockPassport(sbtAddress: string): Promise<boolean> {
  console.log(`Blocking: ${sbtAddress}...`);

  try {
    const res = await fetch(`${API_URL}/api/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-API-Key': ADMIN_API_KEY,
      },
      body: JSON.stringify({ sbtAddress }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      console.log('  Blocked successfully');
      return true;
    } else {
      console.log(`  Failed: ${data.error || JSON.stringify(data)}`);
      return false;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  Error: ${message}`);
    return false;
  }
}

async function main() {
  console.log('Passport Cleanup Tool');
  console.log('================================\n');

  await listPassports();

  if (PASSPORTS_TO_BLOCK.length === 0) {
    console.log('\nNo passports marked for blocking.');
    console.log('Edit PASSPORTS_TO_BLOCK in scripts/cleanup.ts with SBT addresses to hide.');
    return;
  }

  console.log(`\nBlocking ${PASSPORTS_TO_BLOCK.length} passport(s)...\n`);

  let success = 0;
  let failed = 0;

  for (const addr of PASSPORTS_TO_BLOCK) {
    const ok = await blockPassport(addr);
    if (ok) success++;
    else failed++;
  }

  console.log(`\n================================`);
  console.log(`Done! ${success} blocked, ${failed} failed.`);
}

main().catch(console.error);
