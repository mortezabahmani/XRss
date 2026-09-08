# Changelog

All notable changes to XRSS will be documented in this file.

## [1.0.0] - 2026-03-08
### Added
- Initial core architecture and project bootstrap for XRSS on Cloudflare Workers.
- Internal Post model, validation rules, and SSRF prevention.
- HTML content sanitizer removing unsafe scripts, iframes, and event handlers.
- HTTP Provider supporting JSON and RSS/XML parsing with timeout and error handling.
- D1 Storage Adapter with deduplication, retention, and last known-good fallback (ADR-007).
- RSS 2.0 Generator with XML escaping and Atom self-link support.
- Security middleware with robust security headers and Bearer token admin authentication.
- Unit test suite with Vitest covering core, sanitizer, validator, provider, and security modules.
