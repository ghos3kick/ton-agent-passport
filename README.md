# Agent Passport

**On-chain identity and reputation layer for AI agents on TON**

![Tests](https://img.shields.io/badge/tests-120-brightgreen)
![TON](https://img.shields.io/badge/TON-testnet-0098EA)
![MCP](https://img.shields.io/badge/MCP-compatible-green)
![TEP-85](https://img.shields.io/badge/TEP--85-SBT-blueviolet)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

AI agents need verifiable identity. Agent Passport gives each agent a non-transferable Soulbound Token (TEP-85) on TON blockchain — storing its owner, capabilities, API endpoint, and on-chain activity counter. Other agents and services can verify identity, check capabilities, and assess trust without relying on off-chain databases.

## Why this matters

As autonomous AI agents proliferate, the question "who is this agent and can I trust it?" becomes critical. Agent Passport solves this with:

- **Soulbound identity** — one non-transferable SBT per agent, impossible to buy or fake
- **Capability declaration** — agents declare what they can do, verifiable on-chain
- **Reputation signal** — `tx_counter` tracks real activity, incremented only by authority
- **Instant verification** — check any agent via SDK, Telegram bot, or web dashboard

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  TON Blockchain (testnet)               │
│  ┌───────────────────┐    ┌──────────────────────────┐  │
│  │  AgentRegistry    │───>│  AgentPassport (SBT)     │  │
│  │  TEP-62 Collection│    │ Non-transferable, TEP-85 │  │
│  └─────────┬─────────┘    └──────────────────────────┘  │
└────────────┼────────────────────────────────────────────┘
             │
   ┌─────────┴──────────────────────────────┐
   │         @agent-passport/sdk            │
   │   TypeScript · tonapi.io · @ton/core   │
   └──┬──────────────┬─────────────────┬───┘
      │              │                 │
 ┌────▼────────┐ ┌───▼──────────┐ ┌───▼──────────────┐
 │ Telegram Bot│ │  Mini App    │ │  Web Dashboard   │
 │ grammY v1   │ │  Vite+React  │ │  Next.js 16      │
 │ 4 commands  │ │  TG WebApp   │ │  Tailwind v4     │
 │ Admin mint  │ │  TON Connect │ │  TanStack Query  │
 └─────────────┘ └──────────────┘ └──────────────────┘
```

## Project structure

```
agent-passport/
├── contracts/             # Tact smart contracts
│   ├── agent_registry.tact    # TEP-62 collection: mint, batch ops, getters
│   └── agent_passport.tact    # TEP-85 SBT: identity, capabilities, reputation
├── tests/                 # Contract tests (Blueprint + Sandbox)
├── wrappers/              # TypeScript contract wrappers
├── packages/
│   ├── sdk/               # @agent-passport/sdk — shared TypeScript library
│   ├── bot/               # Telegram bot + REST API (grammY, Express)
│   ├── mini-app/          # Telegram Mini App (Vite, React, TON Connect)
│   └── web/               # Web dashboard (Next.js 16, Tailwind v4)
├── mcp-server/            # MCP server for AI agent integration
├── scripts/               # Deploy and seed scripts
├── docs/                  # Architecture, API, contracts, trust score
└── configs/               # nginx configuration template
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Tact, Blueprint, Sandbox |
| Standards | TEP-62 (NFT), TEP-85 (SBT), TEP-64 (metadata) |
| SDK | TypeScript, tonapi-sdk-js, @ton/core |
| Bot + API | grammY v1, Express, @tonconnect/sdk |
| Mini App | Vite, React 19, TON Connect UI |
| Web | Next.js 16, React 19, Tailwind v4, TanStack Query |
| Deployment | VPS, nginx, pm2, Let's Encrypt |

## Quick start

```bash
git clone https://github.com/ghos3kick/ton-agent-passport.git
cd agent-passport
npm install

# Build and test
npx blueprint build
npx blueprint test          # contract tests
cd packages/sdk && npm test # SDK tests
cd packages/mini-app && npx vitest run  # frontend tests

# Deploy registry
npx blueprint run deployRegistry

# Run services
cd packages/bot && npm run dev
cd packages/web && npm run dev
```

## Smart contracts

### AgentRegistry — TEP-62 Collection

Manages the passport collection. Owner-only minting, public mint with fee, batch operations.

| Handler | Access | Description |
|---------|--------|-------------|
| `PublicMintPassport` | anyone (fee required) | Permissionless mint with 0.05 TON fee |
| `BatchIncrementTxCount` | owner | Batch increment agent activity counters |
| `BatchUpdateCapabilities` | owner | Batch update agent capabilities |
| `SetMintFee` | owner | Adjust public mint fee (max 10 TON) |
| `Withdraw` | owner | Withdraw funds (keeps 0.1 TON min balance) |

### AgentPassport — TEP-85 SBT

Each passport is a non-transferable token storing: owner, capabilities, endpoint, metadataUrl, createdAt, txCount, revokedAt.

| Handler | Access | Description |
|---------|--------|-------------|
| `Transfer` | **rejected** | Always reverts — SBT is non-transferable |
| `ProveOwnership` | owner | Cryptographic ownership proof (TEP-85) |
| `RequestOwner` | anyone | Query owner info (TEP-85) |
| `Revoke` | authority | Mark passport as revoked (TEP-85) |
| `Destroy` | owner | Self-destruct and reclaim balance (TEP-85) |
| `UpdateEndpoint` | owner | Change agent API endpoint |
| `IncrementTxCount` | authority | Increment reputation counter |
| `UpdateCapabilities` | authority | Update declared capabilities |

### Contract security

- Every handler has explicit access control
- Transfers unconditionally revert (soulbound enforcement)
- Failed deploys skip index slots (no reuse, prevents collisions)
- Collection origin verification prevents spoofed SetupPassport
- Initialization guard prevents double-setup
- Withdraw enforces minimum 0.1 TON contract balance

## Trust score

Trust Score is computed deterministically from on-chain data:

| Factor | Max points | Source |
|--------|-----------|--------|
| Existence | 10 | Passport exists and is active |
| Capabilities | 10 | 2 points per declared capability |
| Activity | 50 | Value-weighted: 40% tx count + 60% tx volume (log scale) |
| Age | 30 | 1 point per day since creation |

Anti-abuse measures: dust filter (<0.01 TON), circular transfer detection, value-weighted scoring. See [Trust Score docs](docs/TRUST_SCORE.md) for details.

## Telegram bot

| Command | Description |
|---------|-------------|
| `/start` | Welcome message + Mini App button |
| `/info` | What is Agent Passport |
| `/verify` | Verify agent passport by address |

## REST API

5 endpoints behind nginx reverse proxy with multi-layer rate limiting:

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | — | Service health check |
| `/api/passports` | GET | — | List passports with pagination |
| `/api/reputation/:address` | GET | — | Trust score breakdown for an address |
| `/api/public-mint-payload` | POST | — | Generate unsigned tx payload for TON Connect |
| `/api/revoke` | POST | API key | Block passport from explorer |

Full reference with request/response examples: [API docs](docs/API.md)

## MCP Server

AI agents can interact with the passport registry via [Model Context Protocol](https://modelcontextprotocol.io):

| Tool | Description |
|------|-------------|
| `get_passport` | Get agent passport data by address |
| `get_trust_score` | Get trust score breakdown |
| `verify_agent` | Check if agent meets trust threshold |
| `list_agents` | List all registered agents |
| `search_by_capability` | Find agents by capability |

```bash
cd mcp-server && npm run mcp
```

Connect in Claude Desktop: Settings → MCP Servers → Add → use config from `mcp-server/claude-desktop-config.json`

## Security

**120 automated tests** (36 contract, 31 SDK, 45 mini-app, 8 bot) covering access control, SBT enforcement, reputation scoring, and API validation.

- Timing-safe auth checks (`timingSafeEqual`) — prevents side-channel attacks on API keys and Telegram initData
- Security headers: HSTS, CSP, X-Content-Type-Options, no `x-powered-by`
- Multi-layer rate limiting: nginx zones + Express per-IP limits + brute force lockout
- Input validation on all endpoints (address format, URL scheme, name length)
- Transaction mutex prevents concurrent wallet operations
- Network hardening: UFW (22/80/443), nginx-only proxy, SSH key-only, `.env` 600

## Live demo

- **Telegram Bot**: [@agent_passport_ton_bot](https://t.me/agent_passport_ton_bot)
- **Mini App**: available via bot `/app` command

## Documentation

| Document | Description |
|----------|-------------|
| [API Reference](docs/API.md) | REST endpoints, request/response examples |
| [Architecture](docs/ARCHITECTURE.md) | System design, ADRs, infrastructure |
| [Smart Contracts](docs/CONTRACTS.md) | Messages, getters, fees, security model |
| [Trust Score](docs/TRUST_SCORE.md) | Scoring formula, levels, verification |

## Testing

```bash
npx blueprint test                          # contract tests
cd packages/sdk && npm test                 # SDK tests
cd packages/mini-app && npx vitest run      # frontend tests
```

## Built with

This project was developed as part of the
[TON AI Agent Hackathon 2026](https://identityhub.app/contests/ai-hackathon)
(Track 1: Agent Infrastructure).

Development was AI-assisted — architecture design, code review, security audit,
and documentation were done in collaboration with Claude (Anthropic).
All smart contracts, core logic, and deployment were implemented and verified
by the author.

## License

MIT — see [LICENSE](LICENSE)
