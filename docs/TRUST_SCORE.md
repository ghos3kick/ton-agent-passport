# Trust Score

Deterministic reputation score computed from on-chain passport data. No off-chain state, no oracles — anyone can independently verify the score.

## Formula

| Factor | Max points | Calculation |
|--------|-----------|-------------|
| Existence | 10 | Passport exists and is not revoked |
| Capabilities | 10 | 2 points per declared capability (max 5) |
| Activity | 50 | Value-weighted: 40% tx count + 60% tx volume (log₁₀ scale) |
| Age | 30 | 1 point per day since creation (max 30) |

**Total: 0-100 points**

## Levels

| Range | Level |
|-------|-------|
| 0-19 | new |
| 20-39 | basic |
| 40-59 | established |
| 60-79 | trusted |
| 80-100 | veteran |

## Properties

**Deterministic.** Given the same on-chain state, any implementation produces the same score. The formula is public and has no hidden inputs.

**Monotonic growth.** Score can only increase over time: age grows naturally, txCount is append-only (authority can increment but never decrement), capabilities can be expanded.

**Tamper-resistant.** txCount and capabilities are updatable only by the registry authority, not by the passport owner. This prevents self-inflation.

**Revocation-aware.** A revoked passport scores 0 on the existence factor, reducing total score by 10 points.

## Anti-Abuse Measures

### Dust Transaction Filter
Transactions below 0.01 TON are not counted toward TrustScore.
This prevents score inflation through spam micro-transactions.

### Circular Transfer Detection
Circular transfers (A→agent→A within a 5-minute window) are excluded.
Agents can freely receive funds from others — only round-trip transfers
designed to inflate transaction count are filtered out.
Self-transfers (agent→agent) are also excluded.

### Value-Weighted Scoring
TrustScore weighs transaction volume (total TON transferred) more heavily
than raw transaction count. Formula uses logarithmic scaling:

- Transaction count contributes 40% of the activity component
- Transaction volume contributes 60% of the activity component
- Volume uses log₁₀(1 + volume) for diminishing returns at scale
- Falls back to count-only scoring when no volume data is available

This makes 1000 dust transactions worth less than 10 real transactions,
effectively neutralizing spam-based score manipulation.

**Constants:**
| Parameter | Value | Description |
|-----------|-------|-------------|
| MIN_TX_VALUE | 0.01 TON | Dust threshold |
| CIRCULAR_WINDOW | 300s | Time window for circular detection |
| MAX_TX_COUNT | 100 | Full count score at 100 txs |
| MAX_TX_VOLUME | 1000 TON | Full volume score at 1000 TON |
| WEIGHT_COUNT | 0.4 | Count component weight |
| WEIGHT_VOLUME | 0.6 | Volume component weight |

## Limitations

- txCount depends on the registry authority calling IncrementTxCount — there is no automatic on-chain activity tracking
- Capabilities are self-declared strings — the score counts quantity, not validity
- Age rewards longevity but not necessarily quality
- The formula weights activity (50 points) heavily — new agents with genuine capabilities start with low scores

## Implementation

The score is computed in three places, all using the same formula:

1. **Bot API** — `GET /api/reputation/:address`
2. **Mini App** — `src/utils/reputation.ts`
3. **Web Dashboard** — `packages/web/` (via SDK data)

Source of truth is always the on-chain state fetched via TonAPI.
