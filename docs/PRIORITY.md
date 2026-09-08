# Priority Work Order

Work in this order. Do not start later items before earlier ones work.

## P0 — Make it actually produce an X feed

1. Bind storage in `wrangler.toml` (KV **or** D1). Without this, admin shows `storage: none` and posts never persist.
2. Implement a real provider for a public X handle (behind `XDataProvider`).
3. Wire `scheduled()` + `POST /update` to that provider using `X_USERNAME` / runtime config.
4. Add cron trigger (e.g. every 4 hours).

## P1 — Admin that works

1. Remove token-in-query auth; use Bearer or secure cookie session.
2. Admin form fields: X handle, feed title, description, max posts.
3. Live stats from storage (count, last sync, last error).
4. Manual sync button with real success/error feedback.
5. Recent posts table from storage.

## P2 — Open-source hygiene

1. Remove personal `account_id` from committed `wrangler.toml`.
2. Rotate any admin token that was ever pasted in a URL or chat.
3. README: deploy steps, env vars, one-feed-per-deploy model.
4. Keep docs minimal; delete obsolete plan noise when it conflicts with code.

## Definition of done for personal use

- Set `X_USERNAME` + `ADMIN_TOKEN`
- Deploy to Cloudflare
- Cron or manual sync fetches posts
- `GET /` returns real RSS items
- `/admin` can change handle/title and trigger sync without exposing the token in the URL
