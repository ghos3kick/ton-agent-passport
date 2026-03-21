# Contributing

## Setup

```bash
git clone https://github.com/ghos3kick/ton-agent-passport.git
cd agent-passport
npm install
```

## Build order

SDK must build first — bot and web depend on it.

```bash
cd packages/sdk && npm run build
cd packages/bot && npm run build
cd packages/web && npm run build
cd packages/mini-app && npm run build
```

## Tests

```bash
npx blueprint test                          # contract tests
cd packages/sdk && npm test                 # SDK tests
cd packages/mini-app && npx vitest run      # frontend tests
```

## Branch workflow

1. Create a feature branch from `main`
2. Make changes, ensure tests pass
3. Open a pull request with a clear description

## Code style

- Prettier with project config (120 chars, 4 spaces, single quotes)
- TypeScript strict mode
- No secrets in code — use environment variables

## Environment variables

Copy `.env.example` files in each package directory and fill in your values. Never commit `.env` files.
