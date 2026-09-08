# XRSS

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/mortezabahmani/XRss)
[![CI/CD](https://github.com/mortezabahmani/XRss/actions/workflows/ci.yml/badge.svg)](https://github.com/mortezabahmani/XRss/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**XRSS** is a secure, lightweight, self-hosted RSS adapter designed to convert public posts into standard RSS 2.0 feeds on **Cloudflare Workers**.

---

## Architecture & Data Flow

```text
[XDataProvider]
       ↓
[Normalizer]
       ↓
[Validator (SSRF / Schema Check)]
       ↓
[Sanitizer (HTML XSS Protection)]
       ↓
[Internal Post Model]
       ↓
[Cloudflare D1 Storage (Deduplication & Retention)]
       ↓
[RSS 2.0 Generator]
       ↓
[Security Middleware (HSTS, CSP, X-Frame-Options)]
       ↓
[HTTP Response / RSS Feed]
```

---

## Security Model (`docs/SECURITY.md`)

- **Untrusted External Data**: All provider responses are treated as untrusted and strictly validated.
- **SSRF Protection**: Prevents requests targeting localhost, loopback, private networks, and cloud metadata endpoints.
- **XSS Sanitization**: Strips dangerous HTML tags (`<script>`, `<iframe>`, `<object>`, `<embed>`, event handlers, and `javascript:` URIs).
- **Admin Authentication**: Mutation endpoints (e.g., `/update`) require a secure `Authorization: Bearer <ADMIN_TOKEN>` header with timing-safe comparison.
- **Security Headers**: Automatically injects strict production headers (`HSTS`, `CSP`, `X-Frame-Options`, `X-Content-Type-Options`).
- **Resilience**: Upstream failures preserve the last known-good feed (`ADR-007`).

---

## Configuration & Environment Variables

Configure via `wrangler.toml` (`[vars]` and secrets):

| Variable | Description | Default |
| :--- | :--- | :--- |
| `FEED_TITLE` | RSS Feed Title | `XRSS Feed` |
| `FEED_LINK` | Feed Website Link | Request Origin |
| `FEED_DESCRIPTION` | Feed Description | `Secure self-hosted RSS feed converted by XRSS` |
| `PROVIDER_ENDPOINT` | Upstream JSON/RSS API Endpoint | `https://api.example.com/posts` |
| `ADMIN_TOKEN` | Secret Bearer token for triggering `/update` | *(Required for admin mutations)* |

Set production secret:
```bash
npx wrangler secret put ADMIN_TOKEN
```

---

## Development & Testing

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
git clone https://github.com/mortezabahmani/XRss.git
cd XRss
npm install
```

### Local Development
```bash
npm run dev
```

### Testing & Typechecking
```bash
npm test
npm run typecheck
```

---

## Deployment

### One-Click Deploy
Click the button below to deploy XRSS instantly to your Cloudflare Workers account:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/button)

### Manual CLI Deployment
```bash
npx wrangler d1 create xrss-db
# Configure database_id in wrangler.toml
npx wrangler deploy
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.
