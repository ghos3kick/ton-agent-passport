# Roadmap & Known Issues

> Status: Hackathon submission (testnet)
> Last updated: March 2026

---

## Security model

Agent Passport uses a two-layer security architecture:

**On-chain (trustless, immutable):**
- SBT non-transferability — `Transfer` handler unconditionally reverts
- Owner binding — set at mint, cannot be changed
- Activity counter — only authority (registry contract) can increment `txCount`
- Timestamps — `createdAt` uses blockchain time, unforgeable
- Revocation — irreversible, with on-chain timestamp
- Access control — every handler verifies `sender()`

**Off-chain (API/SDK layer):**
- Input validation — name length, URL scheme, address format
- Anti-abuse — dust filter, self-dealing detection, circular transfer detection
- Rate limiting — per-IP limits at nginx and Express layers
- SSRF protection — `isPrivateHost()` blocks internal endpoints

**Why this split?** On-chain string parsing and transaction history analysis would make mint gas prohibitively expensive on TON. The contract enforces what must be trustless (ownership, immutability, authority-gated reputation). The API layer validates what can be validated cheaply. This is the same pattern used by ERC-8004 on Ethereum — registration is permissionless, trust is earned through on-chain activity over time.

**What this means:** someone can bypass the bot and mint directly via the contract with fake capabilities or a malicious endpoint. However, that passport will have 0 `txCount`, 0 age, and unverified capabilities — resulting in a TrustScore of ~10/100. The system is self-correcting: trust is earned, not declared.

---

## Known issues

### Won't fix (by design)

| Issue | Reason |
|-------|--------|
| `fee=0` is possible via `SetMintFee` | Admin flexibility for testnet/promotions. Mainnet will enforce minimum. |
| `PublicMint` allows minting to any address | By design — admin mints passports for agents that don't have wallets yet. |
| Agent names are not unique on-chain | On-chain string uniqueness check is expensive. Uniqueness enforced at API layer. Display names come from `agent-names.json`, not on-chain metadata. |
| `BatchIncrementTxCount` processes one passport per message | Registry forwards to individual passport contracts. True batch (loop over N items) risks hitting gas limits on TON. |
| In-memory rate limiting (not Redis) | Single-instance deployment. Redis is unnecessary overhead for current scale. |
| Bounce handler removed from registry | Index gaps from failed deploys are safe. Index reuse would risk address collisions and lost mint fees. Documented in PENTEST_REPORT.md. |

### Known limitations

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| `txVolume` = 0 for all agents | TrustScore falls back to txCount-only formula | Transaction monitor implemented, volume tracking activates as agents accumulate real activity |
| Metadata shows `{}` in TONAPI for some passports | Early passports minted before metadata hosting was set up | Demo agent metadata now hosted on GitHub (`docs/demo/*.json`). New mints use correct URLs. |
| Authority can update capabilities on revoked passports | `UpdateCapabilities` doesn't check `revokedAt` | By design — admin retains management rights. Document behavior. |
| Authority can increment txCount on revoked passports | `IncrementTxCount` doesn't check `revokedAt` | Same as above. Revoked passports still have historical data. |

---

## Roadmap

### Phase 1 — Post-hackathon hardening

**On-chain capability registry**
Whitelist of valid capability strings stored in the registry contract. Mint validates capabilities against the whitelist. Prevents "AI, quantum, God-mode" spam.

**Staking requirement for public mint**
Economic disincentive for spam. Stake N TON when minting, refundable after M days of good behavior (positive txCount growth, no flags). Slashed if passport gets community-flagged.

**On-chain metadata (TEP-64)**
Move metadata from off-chain URLs to on-chain cells. Eliminates dependency on external hosting. Every passport becomes fully self-contained on TON.

### Phase 2 — Trust network

**Community flagging**
Any passport holder can flag another passport. Flag count visible on-chain. Repeated flags from high-TrustScore passports trigger review. Creates a decentralized moderation layer.

**Mutual attestations**
Agent A vouches for Agent B on-chain. Attestation graph builds a web of trust. TrustScore incorporates incoming attestation count and quality (attestor's own score matters).

**TrustScore v2**
- Add attestation weight to scoring formula
- Add flag penalty (negative signal)
- Add category-specific scores (agent trusted for DeFi ≠ trusted for data)
- Consider time-decay: recent activity weighted higher than old

### Phase 3 — Mainnet & ecosystem

**Mainnet deployment**
- Enforce minimum mint fee
- Final security audit by third-party firm
- Migrate testnet passports (optional bridge for early adopters)

**SDK integrations**
- MCP tool: verify passport inside any MCP-compatible agent
- LangChain tool: `TrustScoreCheck` as a LangChain tool
- TON Agent Kit plugin: native passport verification
- SDK usage example already available: `examples/verify-agent.ts`

**Cross-registry interop**
- Publish passport data in ERC-8004-compatible JSON format
- Enable cross-chain verification (TON passport → Ethereum verifier)
- W3C DID document generation from passport data

**Agent-to-agent protocol**
- Agent A queries Agent B's passport before interaction
- Minimum TrustScore threshold for automated transactions
- Passport-gated API access: "only agents with score > 50 can call my endpoint"

### Phase 4 — Ecosystem growth

**Passport analytics dashboard**
- Global TrustScore distribution
- Activity heatmaps
- Flagging trends
- Agent category breakdown

**Telegram Mini App v2**
- Passport comparison (side-by-side)
- Activity timeline
- Attestation graph visualization
- QR code sharing for passport verification

**Governance**
- DAO for capability registry management
- Community votes on new capability categories
- Dispute resolution for flagged passports

---

## Design decisions

| Decision | Alternatives considered | Why we chose this |
|----------|----------------------|-------------------|
| Tact over FunC | FunC gives more control | Tact: type-safe, readable, fewer bugs. Good for hackathon velocity and auditability. |
| SBT over regular NFT | Transferable NFT (like ERC-8004) | Non-transferability prevents reputation laundering. Core thesis of the project. |
| Off-chain anti-abuse | On-chain validation | Gas cost. String parsing and tx history analysis on-chain would make mint cost 10-50x more. |
| Single authority model | Multi-sig, DAO | Simplicity for v1. Authority = registry contract. Multi-sig planned for mainnet. |
| API-layer name uniqueness | On-chain uniqueness | On-chain string comparison is O(n) scan of all passports. Doesn't scale. |
| No bounce handler in registry | Decrement index on bounce | Index reuse creates address collisions. Gaps are harmless. |
| AI-assisted development | Fully manual | AI accelerates architecture, review, docs. Human controls contracts and core logic. Transparent in README. |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

Issues and feature requests: [GitHub Issues](https://github.com/ghos3kick/ton-agent-passport/issues)
