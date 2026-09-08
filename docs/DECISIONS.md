# XRSS Architecture Decisions

This document records decisions that should not be reconsidered repeatedly
unless new evidence or requirements invalidate them.

## ADR-001 — Primary Runtime

**Decision:** Cloudflare Workers

**Reason:** Low operational overhead, low cost, scheduled execution,
built-in caching, secrets, and suitable serverless runtime.

---

## ADR-002 — Production Scope

**Decision:** One deployment represents one configured X feed.

**Reason:** Keeps v1 small, secure, predictable, and self-hosted.

---

## ADR-003 — X Handle Configuration

**Decision:** The X handle is configuration, not a request parameter.

**Reason:** Prevents XRSS from becoming a public multi-user fetch service.

---

## ADR-004 — No Generic Proxy

**Decision:** XRSS must not expose arbitrary HTTP/X/image/video proxying.

**Reason:** Reduces SSRF, abuse, bandwidth, and security risks.

---

## ADR-005 — Provider Abstraction

**Decision:** Provider-specific logic is isolated behind `XDataProvider`.

**Reason:** Allows future providers without coupling the RSS layer to X.

---

## ADR-006 — RSS Format

**Decision:** RSS 2.0 is the primary feed format for v1.

**Reason:** Broad compatibility with existing feed readers.

---

## ADR-007 — Failure Behavior

**Decision:** Failed updates must preserve the last known-good feed.

**Reason:** Temporary upstream failures must not break the public feed.

---

## ADR-008 — UI Scope

**Decision:** UI is primarily for administration/configuration.

**Reason:** XRSS is a feed service, not a SaaS application.

---

## ADR-009 — Design Direction

**Decision:** Use a restrained professional tooling UI.

**Reason:** Avoid generic AI-generated dashboard aesthetics and unnecessary
visual complexity.

---

## ADR-010 — Storage

**Decision:** [KV / D1]

**Reason:** [Document the final implementation-specific reasoning.]

**Alternatives considered:** [Document briefly.]