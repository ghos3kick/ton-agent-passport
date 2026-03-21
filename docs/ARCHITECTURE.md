# Architecture

## Overview

Agent Passport is a monorepo with three layers: blockchain contracts, a shared SDK, and three application frontends.

```
TON Blockchain (testnet/mainnet)
├── AgentRegistry (TEP-62 Collection)
│   └── AgentPassport (TEP-85 SBT) x N
│
@agent-passport/sdk (TypeScript)
├── Registry operations (list, count, address-by-index)
├── Passport operations (fetch, metadata, verify)
└── Utility functions (address normalization, validation)
│
Applications
├── Telegram Bot + REST API (grammY, Express)
├── Telegram Mini App (Vite, React, TON Connect)
└── Web Dashboard (Next.js, Tailwind, TanStack Query)
```

## Smart contract layer

Two Tact contracts implement the passport system:

**AgentRegistry** acts as a TEP-62 NFT Collection. It deploys individual passport contracts, tracks the total count, and provides batch operations for the registry owner.

**AgentPassport** is a TEP-85 Soulbound Token. Each passport stores owner address, capabilities, API endpoint, metadata URL, creation timestamp, transaction counter, and revocation status. Transfers are unconditionally rejected — passports are non-transferable by design.

The registry owner (authority) can mint passports, increment transaction counters, and update capabilities. Passport owners can update their endpoint and destroy their passport.

## SDK layer

`@agent-passport/sdk` provides a TypeScript client that wraps TonAPI calls. All read operations go through TonAPI's HTTP interface — no direct blockchain node connection required.

Key design decisions:
- Read-only SDK — write operations happen through the bot API or TON Connect
- TonAPI dependency — simpler than maintaining a lite-client connection
- Address normalization — all addresses converted to raw format for consistent comparison

## Application layer

### Telegram Bot + REST API

Single Node.js process running grammY (Telegram bot framework) and Express (HTTP API) on port 3001.

The bot handles user commands (/start, /info) and admin operations (mint). The Express API provides REST endpoints for programmatic access and serves as the backend for the Mini App.

Minting uses a mnemonic-based wallet with a transaction queue to prevent seqno race conditions.

### Telegram Mini App

Static Vite+React build served by nginx at `/mini-app/`. Communicates with the blockchain through the nginx TONAPI proxy and with the bot API through `/api/` reverse proxy.

Uses TON Connect for wallet operations (public mint). The Buffer polyfill is loaded via inline script in index.html — required for TON cryptographic libraries in the browser.

### Web Dashboard

Next.js application on port 3000. Server-side TONAPI proxy route at `/api/tonapi/[...path]` keeps the API key server-side. Client-side uses TanStack Query for data fetching with automatic caching.

## Infrastructure

```
Client → Cloudflare (DNS/proxy) → nginx (443)
                                    ├── /          → Next.js (127.0.0.1:3000)
                                    ├── /api/      → Express (127.0.0.1:3001)
                                    ├── /mini-app/ → static files
                                    └── /tonapi/   → testnet.tonapi.io (with auth)
```

nginx handles TLS termination, rate limiting, CORS, security headers, and reverse proxying. Both application servers bind to 127.0.0.1 — not accessible from the network directly.

pm2 manages the two Node.js processes with automatic restarts and systemd integration.

## Security model

- API key authentication uses timing-safe comparison
- Telegram WebApp initData validated with HMAC-SHA256 (5-minute expiry)
- TONAPI key stays server-side (nginx snippet and server env)
- Express and Next.js bind to localhost only
- nginx enforces rate limits (general + API zones), body size limits, HSTS, CSP, and blocks dotfiles + /node_modules
- Brute force protection: IP lockout after 10 failed auth attempts (15 min cooldown)
- Global Express rate limit: 100 req/min per IP on all API routes
- Transaction queue with mutex prevents seqno race conditions
- SSRF protection on metadata URL fetching (protocol whitelist, 10s timeout)
- Custom 404 handler hides Express framework fingerprint

## ADR: Why SBT over standard NFT

Soulbound tokens cannot be transferred. This is intentional — an agent's identity should not be buyable or tradeable. The registry authority can revoke passports, and owners can destroy them, but ownership cannot change.

## ADR: Why TonAPI over lite-client

TonAPI provides a REST interface over TON's native binary protocol. Trade-off: external dependency in exchange for simpler SDK, no binary parsing, and built-in indexing for owner lookups. The SDK is designed to allow swapping the backend if needed.

## ADR: Why monorepo

All packages share types and the SDK. A single `npm install` resolves workspace dependencies. Build order is enforced: SDK must build before bot and web, since both import from it.
