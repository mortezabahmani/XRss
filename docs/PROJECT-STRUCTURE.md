درست می‌گی؛ **در ساختاری که پیشنهاد دادم، درختوارهٔ پروژه را به‌صورت یک سند مستقل تعریف نکرده بودم.** در `ARCHITECTURE.md` فقط اشاره‌ای به ساختار منطقی سیستم شده بود، نه ساختار فایل‌ها و پوشه‌ها.

برای Hermes بهتر است این موضوع **صریح و مستقل** باشد، چون وقتی پروژه بزرگ‌تر شود، داشتن یک مرجع مشخص برای اینکه «هر چیزی کجا باید قرار بگیرد» جلوی شلوغی Repository و تصمیم‌گیری مجدد را می‌گیرد.

من پیشنهاد می‌کنم یک فایل اضافه کنیم:

### `docs/PROJECT-STRUCTURE.md`

محتوای پیشنهادی:

````md
# Project Structure

This document defines the intended structure of the XRSS repository.

The structure should remain simple and predictable. New files and directories
must have a clear responsibility and should be placed in the most appropriate
existing location.

## Repository Tree

```text
XRSS/
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   ├── UI-UX.md
│   ├── DEVELOPMENT.md
│   ├── RELEASE.md
│   ├── DECISIONS.md
│   └── PROJECT-STRUCTURE.md
│
├── src/
│   ├── index.ts
│   ├── config/
│   ├── core/
│   ├── providers/
│   ├── storage/
│   ├── rss/
│   ├── security/
│   ├── http/
│   └── ui/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── public/
│
├── migrations/
│
├── scripts/
│
├── wrangler.toml
├── package.json
├── tsconfig.json
├── eslint.config.*
├── vitest.config.*
│
├── AGENTS.md
├── PLANS.md
├── README.md
├── SECURITY.md
├── CONTRIBUTING.md
├── CHANGELOG.md
└── LICENSE
````

## Directory Responsibilities

### `.github/`

GitHub-specific configuration.

Contains CI workflows and other repository automation.

Do not put application code here.

### `docs/`

Internal project documentation.

Contains architecture, security, development, release, UI/UX, decisions,
and repository structure documentation.

### `src/`

Production application code.

All runtime logic should live here unless there is a clear reason for it to
exist elsewhere.

### `src/config/`

Configuration parsing, validation, defaults, and environment bindings.

Configuration must not contain business logic.

### `src/core/`

Provider-independent domain logic and internal data models.

This layer should not depend on X-specific implementation details.

### `src/providers/`

External data providers.

X-specific API/fetching logic belongs here.

Provider-specific response formats must not leak into the rest of the
application.

### `src/storage/`

Persistence implementation.

Storage-specific details should remain isolated from business logic.

### `src/rss/`

RSS generation and RSS-specific formatting.

RSS generation must consume the internal post model rather than raw provider
responses.

### `src/security/`

Security-related reusable functionality such as:

* authentication
* authorization
* input validation helpers
* sanitization
* SSRF protection
* security headers
* safe logging helpers

Do not put unrelated business logic here.

### `src/http/`

HTTP routing, request handling, responses, middleware, and endpoint-specific
coordination.

Keep business logic outside the HTTP layer whenever practical.

### `src/ui/`

Admin UI presentation and UI-specific code.

The UI must not become the location for business rules that belong in the
backend/domain layer.

### `tests/`

Automated tests.

Organize tests according to their scope:

* `unit/` — isolated component/function tests
* `integration/` — interactions between multiple components
* `fixtures/` — reusable test data

Security-sensitive behavior should have explicit tests.

### `public/`

Static assets that are intentionally served directly.

Do not put secrets or server-side code here.

### `migrations/`

Database migrations, only if the selected storage technology requires them.

Do not create this directory when the project does not use migrations.

### `scripts/`

Development, maintenance, or release helper scripts that are not part of
the Worker runtime.

Scripts must not contain production secrets.

## File Placement Rules

Before creating a new file:

1. Check whether an existing file already has the appropriate responsibility.
2. Prefer an existing directory over creating a new one.
3. Keep related functionality together.
4. Create a new directory only when it represents a meaningful architectural
   boundary.
5. Do not create directories merely for organizational aesthetics.

## Important Boundaries

The following boundaries must remain clear:

```text
Provider
   ↓
Normalizer
   ↓
Validator
   ↓
Sanitizer
   ↓
Internal Post Model
   ↓
Storage
   ↓
RSS Generator
   ↓
HTTP
```

Provider-specific code must not leak into:

* RSS generation
* storage abstractions
* UI
* generic domain models

UI code must not directly implement:

* provider access
* storage logic
* authentication rules
* security policy

## Structure Evolution

This tree is an intended structure, not a reason to force code into the wrong
directory.

If implementation requirements make the structure inadequate:

1. Prefer the smallest structural change.
2. Update this document.
3. If the change is an architectural decision, record it in
   `docs/DECISIONS.md`.
4. Do not create speculative directories for future features.

The actual repository always takes precedence over this example tree.
If the implementation differs intentionally, update this document rather than
silently allowing the documentation to become stale.

````
