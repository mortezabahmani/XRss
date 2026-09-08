# XRSS Security

## Security Principles

- Treat all external/provider data as untrusted.
- Never hardcode secrets or credentials.
- Never bypass authentication, CAPTCHA, rate limits, access controls, or
  provider restrictions.
- Keep the attack surface minimal.
- Prefer secure defaults.
- Do not weaken security to make a feature easier to implement.

## Secrets

Never commit:
- API keys
- bearer tokens
- cookies
- auth_token
- ct0
- `.env` files containing secrets
- personal credentials

Secrets must be supplied through Cloudflare secrets/environment configuration.

Never expose secrets in:
- URLs
- query parameters
- logs
- RSS
- health responses
- client-side JavaScript

## Authentication

Admin functionality must be authenticated.

Requirements:
- Bearer token or an equivalent secure mechanism
- timing-safe secret comparison where applicable
- no credentials in URLs
- mutation endpoints must be POST-only
- rate-limit sensitive admin operations

## Input Validation

Validate all:
- configuration values
- query parameters
- request bodies
- provider responses
- URLs
- identifiers

Reject unexpected values rather than silently accepting them.

## HTML / XML Security

Sanitize external HTML.

Remove:
- `<script>`
- `<iframe>`
- `<object>`
- `<embed>`
- unsafe SVG
- event-handler attributes
- `javascript:` URLs
- `data:` URLs where unsafe

Escape all XML output correctly.

Test against XML injection and malformed content.

## SSRF

XRSS must not become an arbitrary HTTP proxy.

Reject requests targeting:
- localhost
- loopback
- private networks
- link-local addresses
- cloud metadata endpoints
- unsupported schemes such as `file:`, `data:`, `javascript:`

Only explicitly allowed external destinations may be fetched.

## Logging

Logs must contain enough information for debugging without exposing:
- secrets
- authentication tokens
- cookies
- sensitive request data

Use stable error categories instead of dumping raw provider responses.

## Availability

A failed update must not destroy the last known-good feed.

When an update fails:
- preserve existing valid posts
- record the failure
- serve the previous valid RSS feed when possible

## Security Changes

Any change that weakens:
- authentication
- input validation
- SSRF protection
- output sanitization
- secret handling
- rate limiting

requires explicit review and must not be made merely for convenience.