# Security notes — AgenticAI

## Fixed in branch `fix/security-and-hardening`

1. **IDOR on agents** — `get` / `update` / `delete` now require ownership (`userId`).
2. **IDOR on executions** — list/create only allowed for agents owned by the caller.
3. **IDOR on notifications** — markAsRead / delete scoped to `userId`.
4. **API keys** — generated with `crypto.randomBytes` instead of `Math.random`.
5. **Workflows** — create persists to DB; execute validates agent ownership (runtime still stub).

## Remaining recommendations

- Store **hashed** API keys at rest (show raw key only once at creation).
- Add integration tests for ownership denial (404/403 for other users' resources).
- Rotate any keys previously generated with `Math.random`.
- Restrict CORS and cookie flags in production.
- Reduce coupling to Manus for standalone deployments.

## Reporting

Open a private security issue or contact the repository owner.
