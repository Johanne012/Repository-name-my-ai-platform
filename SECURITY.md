# Security notes — AgenticAI

## Fixed on branch `fix/security-and-hardening`

### Round 1
1. **IDOR on agents** — get / update / delete require ownership.
2. **IDOR on executions** — list/create only for owned agents.
3. **IDOR on notifications** — markAsRead / delete scoped to userId.
4. **API keys** — `crypto.randomBytes` instead of `Math.random`.
5. **Workflows** — create persists to DB; execute validates ownership.

### Round 2
6. **API keys at rest** — only SHA-256 hash is stored; `keyPrefix` for UI.
7. **One-time reveal** — raw key returned only on create; list never exposes full key.
8. **Revoke** — `apiKeys.revoke` deactivates key for owner only.
9. Schema: `apiKeys.keyPrefix` column (run `pnpm db:push` after merge).

## After merge
```bash
pnpm db:push   # apply keyPrefix column
pnpm test
```

Rename the GitHub repo from `Repository-name-my-ai-platform` to something like `agentic-ai`.

Rotate any keys created before hashing was introduced.

## Still recommended
- Integration tests for cross-user access denial
- CORS / cookie hardening in production
- Reduce Manus coupling for standalone deploy
