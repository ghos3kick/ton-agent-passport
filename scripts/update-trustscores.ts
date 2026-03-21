/**
 * Update TrustScores — sends BatchIncrementTxCount to give demo agents different scores
 * Usage: npx tsx scripts/update-trustscores.ts
 *
 * Score formula: existence(10) + activity(min(50, txCount*5)) + age(min(30, days)) + capabilities(min(10, caps*2))
 *
 * Target txCounts for diverse scores:
 *   Atlas AI (index 1):          txCount += 15 → activity=50 → score ~69
 *   Nexus Trading Bot (index 2): txCount += 9  → activity=45 → score ~62
 *   Sentinel Guard (index 3):    txCount += 5  → activity=25 → score ~42
 *   DataStream Oracle (index 4): txCount += 2  → activity=10 → score ~27
 *   Muse Creative AI (index 5):  txCount += 0  → activity=0  → score ~17
 */

import { beginCell } from '@ton/core';
import { WalletContractV4, TonClient, internal, SendMode } from '@ton/ton';
import { mnemonicToPrivateKey, KeyPair } from '@ton/crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let REGISTRY_ADDRESS = '';
let MNEMONIC = '';
let NETWORK = 'testnet';

try {
  const envFile = readFileSync(resolve(__dirname, '../packages/bot/.env'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^(\w+)=(.+)$/);
    if (!match) continue;
    const [, key, val] = match;
    if (key === 'REGISTRY_ADDRESS') REGISTRY_ADDRESS = val;
    if (key === 'MNEMONIC') MNEMONIC = val;
    if (key === 'NETWORK') NETWORK = val;
  }
} catch {}

const BATCH_INCREMENT_OPCODE = 2465950524; // Tact opcode for BatchIncrementTxCount

interface IncrementPlan {
  name: string;
  agentIndex: number;
  increments: number;
}

const PLAN: IncrementPlan[] = [
  { name: 'Atlas AI', agentIndex: 1, increments: 3 },         // 12 done, need 3 more
  { name: 'Nexus Trading Bot', agentIndex: 2, increments: 9 },
  { name: 'Sentinel Guard', agentIndex: 3, increments: 5 },
  { name: 'DataStream Oracle', agentIndex: 4, increments: 2 },
];

let keyPair: KeyPair;
let wallet: WalletContractV4;
let client: TonClient;

async function init() {
  const words = MNEMONIC.trim().split(/\s+/);
  keyPair = await mnemonicToPrivateKey(words);
  wallet = WalletContractV4.create({ publicKey: keyPair.publicKey, workchain: 0 });

  const isTestnet = NETWORK === 'testnet';
  client = new TonClient({
    endpoint: isTestnet
      ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
      : 'https://toncenter.com/api/v2/jsonRPC',
  });

  console.log(`Wallet: ${wallet.address.toString({ testOnly: isTestnet })}`);
}

async function sendBatchIncrement(agentIndex: number): Promise<void> {
  const contract = client.open(wallet);

  // Get seqno with retry
  let seqno: number;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      seqno = await contract.getSeqno();
      break;
    } catch {
      if (attempt === 2) throw new Error('Failed to get seqno');
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  const body = beginCell()
    .storeUint(BATCH_INCREMENT_OPCODE, 32)
    .storeUint(BigInt(Date.now()), 64)
    .storeUint(BigInt(agentIndex), 64)
    .endCell();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await contract.sendTransfer({
        secretKey: keyPair.secretKey,
        seqno: seqno!,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: [
          internal({
            to: REGISTRY_ADDRESS,
            value: BigInt(50_000_000),
            body,
            bounce: true,
          }),
        ],
      });
      break;
    } catch {
      if (attempt === 2) throw new Error('Failed to send tx');
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  // Wait for seqno increment
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1500));
    try {
      const newSeqno = await contract.getSeqno();
      if (newSeqno > seqno!) return;
    } catch { /* retry */ }
  }
  throw new Error('Transaction timeout');
}

async function main() {
  console.log('TrustScore Update Script');
  console.log('========================');

  if (!REGISTRY_ADDRESS || !MNEMONIC) {
    console.error('Missing REGISTRY_ADDRESS or MNEMONIC. Check packages/bot/.env');
    process.exit(1);
  }

  console.log(`Registry: ${REGISTRY_ADDRESS}`);
  console.log(`Network: ${NETWORK}`);
  await init();

  const totalIncrements = PLAN.reduce((sum, p) => sum + p.increments, 0);
  console.log(`\nTotal transactions needed: ${totalIncrements}\n`);

  let done = 0;
  for (const agent of PLAN) {
    console.log(`\n${agent.name} (index ${agent.agentIndex}): ${agent.increments} increments`);

    for (let i = 0; i < agent.increments; i++) {
      try {
        await sendBatchIncrement(agent.agentIndex);
        done++;
        console.log(`  [${done}/${totalIncrements}] increment ${i + 1}/${agent.increments} OK`);
      } catch (err) {
        console.error(`  FAILED increment ${i + 1}:`, err instanceof Error ? err.message : err);
        await new Promise(r => setTimeout(r, 5000));
        try {
          await sendBatchIncrement(agent.agentIndex);
          done++;
          console.log(`  [${done}/${totalIncrements}] increment ${i + 1}/${agent.increments} OK (retry)`);
        } catch (retryErr) {
          console.error(`  RETRY FAILED:`, retryErr instanceof Error ? retryErr.message : retryErr);
        }
      }

      // Longer delay between transactions to avoid toncenter rate limits
      if (i < agent.increments - 1) {
        await new Promise(r => setTimeout(r, 8000));
      } else {
        // Delay between agents
        await new Promise(r => setTimeout(r, 10000));
      }
    }
  }

  console.log(`\n========================`);
  console.log(`Done! ${done}/${totalIncrements} increments sent.`);
  console.log('\nWait 30s for cache, then: curl -s "https://<YOUR_DOMAIN>/api/passports" | jq \'.passports[] | {name, trustScore}\'');
}

main().catch(console.error);
