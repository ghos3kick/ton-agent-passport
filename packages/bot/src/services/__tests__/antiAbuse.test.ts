/**
 * Anti-abuse filter tests.
 *
 * These test the pure filter logic from txMonitor without TonAPI calls.
 * Run: npx tsx --test packages/bot/src/services/__tests__/antiAbuse.test.ts
 *   or add vitest/jest to packages/bot
 */

import { describe, it, expect } from 'vitest';
import { filterTransactions, ANTI_ABUSE_MIN_TX_VALUE, CIRCULAR_WINDOW_SEC } from '../txMonitor';

// Helper to create a test transaction
function makeTx(overrides: Partial<{
    hash: string; sender: string; recipient: string; value: bigint; timestamp: number;
}> = {}) {
    return {
        hash: overrides.hash || `tx_${Math.random().toString(36).slice(2)}`,
        sender: overrides.sender || '0:aaaa000000000000000000000000000000000000000000000000000000000001',
        recipient: overrides.recipient || '0:bbbb000000000000000000000000000000000000000000000000000000000002',
        value: overrides.value ?? 100_000_000n, // 0.1 TON
        timestamp: overrides.timestamp || Math.floor(Date.now() / 1000),
    };
}

const AGENT_OWNER = '0:1111000000000000000000000000000000000000000000000000000000000001';
const OTHER_ADDR = '0:2222000000000000000000000000000000000000000000000000000000000002';

describe('Anti-Abuse: Dust Filter', () => {
    it('should reject transactions below 0.01 TON', () => {
        const dustTx = makeTx({
            sender: OTHER_ADDR,
            recipient: AGENT_OWNER,
            value: 1_000_000n, // 0.001 TON
        });
        const result = filterTransactions(AGENT_OWNER, [dustTx]);
        expect(result.valid).toHaveLength(0);
        expect(result.dustRejected).toBe(1);
    });

    it('should accept transactions at exactly 0.01 TON', () => {
        const tx = makeTx({
            sender: OTHER_ADDR,
            recipient: AGENT_OWNER,
            value: ANTI_ABUSE_MIN_TX_VALUE, // exactly 0.01 TON
        });
        const result = filterTransactions(AGENT_OWNER, [tx]);
        expect(result.valid).toHaveLength(1);
        expect(result.dustRejected).toBe(0);
    });

    it('should accept normal transactions above threshold', () => {
        const tx = makeTx({
            sender: OTHER_ADDR,
            recipient: AGENT_OWNER,
            value: 500_000_000n, // 0.5 TON
        });
        const result = filterTransactions(AGENT_OWNER, [tx]);
        expect(result.valid).toHaveLength(1);
    });
});

describe('Anti-Abuse: Self-Transfer Detection', () => {
    it('should reject self-transfers (agent sends to itself)', () => {
        const selfTx = makeTx({
            sender: AGENT_OWNER,
            recipient: AGENT_OWNER,
            value: 1_000_000_000n,
        });
        const result = filterTransactions(AGENT_OWNER, [selfTx]);
        expect(result.valid).toHaveLength(0);
        expect(result.selfRejected).toBe(1);
    });
});

describe('Anti-Abuse: Circular Transfer Detection', () => {
    it('should reject circular transfers within time window', () => {
        const now = Math.floor(Date.now() / 1000);

        // OTHER sends to AGENT
        const inTx = makeTx({
            hash: 'circular_in',
            sender: OTHER_ADDR,
            recipient: AGENT_OWNER,
            value: 1_000_000_000n,
            timestamp: now,
        });
        // AGENT sends back to OTHER within window
        const outTx = makeTx({
            hash: 'circular_out',
            sender: AGENT_OWNER,
            recipient: OTHER_ADDR,
            value: 1_000_000_000n,
            timestamp: now + 60, // 1 minute later
        });

        const result = filterTransactions(AGENT_OWNER, [inTx, outTx]);
        expect(result.valid).toHaveLength(0);
        expect(result.circularRejected).toBe(2);
    });

    it('should accept transfers outside circular window', () => {
        const now = Math.floor(Date.now() / 1000);

        const inTx = makeTx({
            hash: 'noncircular_in',
            sender: OTHER_ADDR,
            recipient: AGENT_OWNER,
            value: 1_000_000_000n,
            timestamp: now,
        });
        // Return transfer well outside the window
        const outTx = makeTx({
            hash: 'noncircular_out',
            sender: AGENT_OWNER,
            recipient: OTHER_ADDR,
            value: 1_000_000_000n,
            timestamp: now + CIRCULAR_WINDOW_SEC + 100,
        });

        const result = filterTransactions(AGENT_OWNER, [inTx, outTx]);
        expect(result.valid).toHaveLength(2);
        expect(result.circularRejected).toBe(0);
    });

    it('should allow agent to receive funds normally (not circular)', () => {
        const now = Math.floor(Date.now() / 1000);
        const THIRD_PARTY = '0:3333000000000000000000000000000000000000000000000000000000000003';

        // Agent receives from OTHER
        const inTx = makeTx({
            sender: OTHER_ADDR,
            recipient: AGENT_OWNER,
            value: 5_000_000_000n,
            timestamp: now,
        });
        // Agent sends to a DIFFERENT address (not circular)
        const outTx = makeTx({
            sender: AGENT_OWNER,
            recipient: THIRD_PARTY,
            value: 2_000_000_000n,
            timestamp: now + 10,
        });

        const result = filterTransactions(AGENT_OWNER, [inTx, outTx]);
        expect(result.valid).toHaveLength(2);
        expect(result.circularRejected).toBe(0);
    });
});

describe('Anti-Abuse: Combined Filters', () => {
    it('should handle mixed valid and invalid transactions', () => {
        const now = Math.floor(Date.now() / 1000);
        const THIRD = '0:4444000000000000000000000000000000000000000000000000000000000004';

        const txs = [
            // Dust — rejected
            makeTx({ hash: 'dust1', sender: OTHER_ADDR, recipient: AGENT_OWNER, value: 100n, timestamp: now }),
            // Self-transfer — rejected
            makeTx({ hash: 'self1', sender: AGENT_OWNER, recipient: AGENT_OWNER, value: 1_000_000_000n, timestamp: now }),
            // Circular pair — rejected
            makeTx({ hash: 'circ_in', sender: OTHER_ADDR, recipient: AGENT_OWNER, value: 500_000_000n, timestamp: now }),
            makeTx({ hash: 'circ_out', sender: AGENT_OWNER, recipient: OTHER_ADDR, value: 500_000_000n, timestamp: now + 30 }),
            // Valid incoming
            makeTx({ hash: 'valid1', sender: THIRD, recipient: AGENT_OWNER, value: 2_000_000_000n, timestamp: now }),
        ];

        const result = filterTransactions(AGENT_OWNER, txs);
        expect(result.dustRejected).toBe(1);
        expect(result.selfRejected).toBe(1);
        expect(result.circularRejected).toBe(2);
        expect(result.valid).toHaveLength(1);
        expect(result.valid[0].hash).toBe('valid1');
    });
});
