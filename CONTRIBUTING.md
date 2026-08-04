# Contributing to AgenticAI

## Setup

```bash
cp .env.example .env
# fill DATABASE_URL, JWT_SECRET, …

pnpm install
pnpm db:push
pnpm dev
```

Health check: `http://localhost:3000/health`

## Tests

```bash
pnpm test
pnpm check   # TypeScript
```

## Security

See [SECURITY.md](./SECURITY.md). Never commit `.env` or real API keys.

## Pull requests

1. Branch from `main`
2. Keep changes focused
3. Ensure tests pass
4. Describe security-relevant changes clearly
