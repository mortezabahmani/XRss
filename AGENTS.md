# XRSS — Agent Rules (Read This First)

You are the coding agent for **XRSS**.
Do real work. Do not answer with short telegraphic status lines.
When given a task: inspect code → implement → test → report concrete results.

## Product (v1)

XRSS is a **single-feed** Cloudflare Worker:

- Public: `GET /` returns RSS 2.0
- Private: `/admin` + admin APIs require `ADMIN_TOKEN`
- One deployment = one X handle / one feed
- Handle and settings come from **config/secrets**, never from public unauthenticated URL params that fetch arbitrary targets

Not in scope for v1:
- multi-tenant public proxy
- arbitrary URL fetching as a service
- SaaS marketing UI

## Hard Rules

1. **Execute.** Implement the task. Do not only describe it.
2. **No secrets in git.** Never commit tokens, cookies, `.env`, `account_id` of a personal account, or real credentials.
3. **No token in URL.** Admin auth must use `Authorization: Bearer` or HttpOnly cookie — not `?token=`.
4. **Treat provider data as untrusted.** Validate, sanitize HTML, escape XML.
5. **No SSRF expansion.** Do not turn XRSS into an open proxy.
6. **Preserve last-good feed** on upstream failure.
7. **Keep modules small.** Provider ≠ storage ≠ RSS ≠ HTTP UI.
8. **Minimal deps.** Prefer platform APIs (Workers, KV, D1).
9. **Docs stay short.** Prefer updating code + README over more markdown files.
10. **Done means running.** Typecheck + tests pass; deploy config is coherent.

## Current Known Gaps (fix these first when relevant)

- No real X timeline provider yet (`HttpDataProvider` only fetches a generic endpoint).
- Production may have **no storage binding** (`storage: "none"`) — bind KV or D1.
- Admin login currently puts token in query string — insecure; fix it.
- `wrangler.toml` may lack cron triggers and may contain a personal `account_id` — remove personal IDs from the public repo.
- Admin UI must be functional, not decorative: show real stats, config, sync result, errors, empty states.

## Admin UI Requirements

Admin is a **tooling panel**, not a dashboard showcase.

Must work:
- Login without leaking token in URL (prefer session cookie after password/token submit)
- Show: storage backend, post count, last sync time, last error, configured handle/source
- Form: X username (or source), feed title, description, max posts
- Button: Manual sync → calls `POST /update` with Bearer token
- Table: recent stored posts (title, date, link)
- Clear error/success alerts
- Responsive, readable dark tooling UI (restraint, no glassmorphism, no fake metrics)

## Preferred Config Model

Environment / secrets:
- `ADMIN_TOKEN` (secret, required)
- `X_USERNAME` (public handle to track)
- `FEED_TITLE`, `FEED_LINK`, `FEED_DESCRIPTION`
- `MAX_POSTS` (default 20–50)
- Storage: `KV` and/or `DB` (D1) bindings

Cron example:
```toml
[triggers]
crons = ["0 */4 * * *"]
```

## Workflow For Every Task

1. Read only the files needed for the task (do not reread every doc forever).
2. Implement the smallest change that fully solves the task.
3. Run: `npm test`, `npm run typecheck` (and lint if configured).
4. Summarize: what changed, how to verify, remaining risks.

## Response Style To The User

- Write complete sentences.
- Show file paths you changed.
- If blocked, state the exact blocker and the next code change needed.
- Do not claim Phase complete unless code + tests prove it.

## Out Of Scope Noise

Ignore imaginary skills named Impeccable / Hallmark / Anti-UI-Slop if they are not installed.
Follow the UI rules in this file instead.
