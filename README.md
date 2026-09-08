# XRSS

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/mortezabahmani/XRss)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**XRSS** is a secure, lightweight, self-hosted RSS 2.0 adapter for public X (Twitter) feeds running on **Cloudflare Workers**.

---

## Key Features

- **Single Feed Model**: One worker deployment represents one configured public X account feed.
- **Automated Cron Polling**: Periodically polls upstream public X endpoints (e.g. every 4 hours) and appends/deduplicates posts.
- **Resilient Fallback**: Upstream network or Nitter failures preserve the last known-good feed without breaking subscribers.
- **Security-First**: Strict XSS HTML sanitization, SSRF IP/scheme validation, timing-safe Bearer authentication, and HttpOnly session cookies for `/admin`.
- **Restrained Admin Control Center**: Dark, functional control panel for configuring target usernames, viewing cached posts, tracking sync status/errors, and triggering instant sync.

---

## Configuration & Environment Variables

Configure via `wrangler.toml` (`[vars]`) or Cloudflare Workers secrets:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `X_USERNAME` | Target public X (Twitter) username | `elonmusk` |
| `ADMIN_TOKEN` | Administrative secret for `/admin` & `/update` | *(Required secret)* |
| `FEED_TITLE` | Custom RSS Feed Title | `@username on X` |
| `FEED_DESCRIPTION` | Feed Description | `Public posts from @username on X` |
| `MAX_POSTS` | Maximum retention post count in storage | `100` |

### Setting Admin Secret
```bash
npx wrangler secret put ADMIN_TOKEN
```

---

## Local Verification & Testing

### Installation & Setup
```bash
git clone https://github.com/mortezabahmani/XRss.git
cd XRss
npm install
```

### Run Tests & Typecheck
```bash
npm test
npm run typecheck
```

### Local Dev Server
```bash
npm run dev
```

---

## Deployment

### Manual CLI Deployment
```bash
npx wrangler deploy
```

---

## Verification & API Endpoints

- `GET /` or `GET /feed.xml` — Public RSS 2.0 feed output.
- `GET /health` — Service health & storage status JSON.
- `GET /admin` — Secure Admin Control Center.
- `POST /admin/login` — Authenticates admin token and sets an `HttpOnly` session cookie.
- `POST /update` — Triggers immediate post fetching and storage update (requires `Authorization: Bearer <ADMIN_TOKEN>` or active session cookie).

---

## License

MIT License. See [LICENSE](LICENSE) for details.
