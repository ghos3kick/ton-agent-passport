# Smart Contracts

Two Tact contracts implementing on-chain identity for AI agents.

## AgentRegistry

TEP-62 NFT Collection that manages passport lifecycle.

**Source:** `contracts/agent_registry.tact`

### State

| Field | Type | Description |
|-------|------|-------------|
| owner | Address | Registry authority |
| nextItemIndex | uint64 | Counter for deployed passports |
| collectionContent | Cell | Off-chain collection metadata URL |
| mintFee | coins | Public mint fee (default 0.05 TON) |

### Messages

| Message | Sender | Description |
|---------|--------|-------------|
| MintPassport | owner | Deploy a new passport SBT |
| PublicMintPassport | anyone | Permissionless mint (pays mintFee) |
| SetMintFee | owner | Update fee (max 10 TON) |
| Withdraw | owner | Withdraw funds (keeps 0.1 TON minimum) |
| BatchIncrementTxCount | owner | Forward txCount increment to a passport |
| BatchUpdateCapabilities | owner | Forward capability update to a passport |

### Getters (TEP-62)

| Getter | Returns |
|--------|---------|
| get_collection_data | CollectionData (next_item_index, content, owner) |
| get_nft_address_by_index(index) | Address of passport at index |
| get_nft_content(index, content) | Individual content cell |
| get_agent_count | Total passport count |
| mintFee | Current mint fee |

### Constants

| Name | Value |
|------|-------|
| PASSPORT_DEPLOY_COST | 0.05 TON |
| GAS_RESERVE | 0.06 TON |

---

## AgentPassport

TEP-85 Soulbound Token representing an agent's on-chain identity.

**Source:** `contracts/agent_passport.tact`

### State

| Field | Type | Description |
|-------|------|-------------|
| collection | Address | Parent registry |
| index | uint64 | Position in collection |
| owner | Address | Agent owner wallet |
| authority | Address | Registry (can revoke, update) |
| content | Cell | Metadata content |
| capabilities | String | Comma-separated capability list |
| endpoint | String | Agent API endpoint URL |
| metadataUrl | String | Off-chain metadata URL |
| createdAt | uint64 | Deployment timestamp |
| txCount | uint64 | Activity counter (reputation signal) |
| revokedAt | uint64 | Revocation timestamp (0 = active) |
| isInitialized | Bool | Initialization guard |

### Messages

| Message | Sender | Description |
|---------|--------|-------------|
| SetupPassport | collection | Initialize after deployment |
| Transfer | **rejected** | Always reverts (soulbound) |
| ProveOwnership | owner | Ownership proof to destination (TEP-85) |
| RequestOwner | anyone | Query owner info (TEP-85) |
| Revoke | authority | Mark passport as revoked (TEP-85) |
| Destroy | owner | Self-destruct and reclaim balance (TEP-85) |
| UpdateEndpoint | owner | Change API endpoint |
| IncrementTxCount | authority | Increment activity counter |
| UpdateCapabilities | authority | Update capability declaration |

### Getters

| Getter | Standard | Returns |
|--------|----------|---------|
| get_nft_data | TEP-62 | NftData (init, index, collection, owner, content) |
| get_authority_address | TEP-85 | Authority address |
| get_revoked_time | TEP-85 | Revocation timestamp |
| get_passport_data | custom | Full passport state |

### Security

- **Soulbound enforcement:** Transfer handler unconditionally reverts
- **Collection origin check:** SetupPassport only accepted from deploying collection
- **Initialization guard:** SetupPassport rejected after first call
- **Authority-only operations:** IncrementTxCount, UpdateCapabilities, Revoke
- **Owner-only operations:** UpdateEndpoint, Destroy, ProveOwnership

## Gas costs

| Operation | Approximate cost |
|-----------|-----------------|
| Mint (admin) | ~0.11 TON (deploy + gas) |
| Mint (public) | ~0.11 TON (deploy + gas + fee) |
| Update endpoint | ~0.02 TON |
| Increment txCount | ~0.02 TON |
| Revoke | ~0.02 TON |
| Destroy | refunds remaining balance |
