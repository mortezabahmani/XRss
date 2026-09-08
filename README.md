# XRSS

Secure, self-hosted, lightweight RSS adapter for converting public posts into standard RSS 2.0 feeds on Cloudflare Workers.

## Features
- **Cloudflare Workers Native**: Fast, edge-deployed, serverless, low-cost.
- **Security-First**: Strict input validation, SSRF protection, HTML sanitization, secure headers, and Bearer token admin authentication.
- **Robust Storage**: Cloudflare D1 integration with deduplication, retention, and fallback to last known-good feed upon upstream failure.
- **Clean RSS 2.0**: Standard-compliant RSS 2.0 feed generator with full XML escaping.

## Quick Start

### Installation & Development
```bash
npm install
npm run dev
```

### Testing & Typechecking
```bash
npm test
npm run typecheck
```

### Deployment
```bash
npx wrangler deploy
```

## License
MIT
