# XRSS Architecture

## Overview

XRSS is a small, secure, self-hosted service that converts public X posts
into an RSS 2.0 feed.

Primary runtime:
- Cloudflare Workers
- TypeScript
- Wrangler

## Data Flow

XDataProvider
→ Normalizer
→ Validator
→ Sanitizer
→ Internal Post Model
→ Storage
→ RSS Generator
→ HTTP Response

## Core Components

### Provider
Responsible only for retrieving public X data.

### Normalizer
Converts provider-specific data into the internal post model.

### Validator
Rejects malformed or incomplete data.

### Sanitizer
Treats all external content as untrusted and removes unsafe HTML/content.

### Storage
Persists normalized posts and metadata such as last successful update and
provider pagination state.

### RSS Generator
Produces valid RSS 2.0 without provider-specific logic.

### HTTP Layer
Exposes public RSS/health endpoints and authenticated admin endpoints.

## Design Rules

- Keep provider logic isolated from RSS generation.
- Keep business logic independent from HTTP/UI code.
- Prefer small modules with single responsibilities.
- Avoid unnecessary abstractions and dependencies.
- Configuration belongs in environment/configuration, not request parameters.
- One deployment represents one configured X feed.
- Do not turn XRSS into a generic proxy or multi-user service in v1.

## Storage

Evaluate KV vs D1 based on:
- consistency
- concurrency
- atomicity
- cost
- simplicity
- read/write characteristics
- suitability for scheduled updates

Record the final decision in `docs/DECISIONS.md`.

## Future Extensions

Architecture should allow:
- additional providers
- multiple feeds
- Atom/JSON Feed
- additional deployment adapters

Do not implement future features unless required by the current plan.