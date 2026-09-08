آره. `DEVELOPMENT.md` قبلی بیش از حد کلی بود و چند چیز مهم برای Hermes را مشخص نمی‌کرد. بهتر است این فایل **قرارداد عملیاتی توسعه** باشد: Hermes بداند پروژه را چطور اجرا، تغییر، تست و تحویل کند؛ بدون اینکه دوباره وارد جزئیات `AGENTS.md` یا معماری شود.

پیشنهاد بهتر من:

````md
# Development Guide

This document defines the standard development workflow for XRSS.

## 1. Development Principles

- Make the smallest change that correctly solves the problem.
- Prefer simple, explicit solutions over unnecessary abstractions.
- Reuse existing code and platform capabilities before adding dependencies.
- Do not implement speculative features.
- Preserve existing behavior unless the task explicitly requires changing it.
- Treat security, compatibility, and maintainability as part of correctness.
- Do not ask the user to choose between equivalent implementation details.
  Make the appropriate engineering decision autonomously.
- Ask the user only when a decision materially changes scope, security,
  cost, external behavior, or an explicit project requirement.

## 2. Before Changing Code

Always:

1. Read `AGENTS.md`.
2. Read the relevant documentation in `docs/`.
3. Read `PLANS.md` when the task is part of planned work.
4. Inspect the existing implementation and tests.
5. Identify the smallest set of files that need to change.
6. Check existing patterns before introducing a new one.

Do not modify code based only on assumptions about the project.

## 3. Implementation

Follow these rules:

- TypeScript is the primary language.
- Keep modules focused and cohesive.
- Keep business logic independent from HTTP/UI concerns.
- Keep provider-specific logic isolated from the core domain.
- Validate data at trust boundaries.
- Treat external data as untrusted.
- Prefer deterministic behavior.
- Handle expected failures explicitly.
- Avoid silent fallbacks that hide real errors.
- Avoid unnecessary dependencies.
- Do not introduce a framework or library when native platform APIs are
  sufficient.
- Keep Cloudflare Workers compatibility in mind.

## 4. Configuration

Configuration must be explicit and validated.

- Never hardcode secrets.
- Never commit credentials, tokens, cookies, or local environment files
  containing secrets.
- Use environment variables, Cloudflare bindings, or secrets as appropriate.
- Validate configuration at startup or at the relevant execution boundary.
- Fail clearly when required configuration is missing or invalid.
- Do not expose internal configuration through public endpoints.

The X handle is deployment configuration, not a public request parameter.

## 5. Testing

Every behavioral change should include appropriate tests.

Prioritize tests for:

- normal behavior
- invalid input
- configuration validation
- provider failures
- duplicate handling
- storage behavior
- RSS generation
- XML escaping
- HTML sanitization
- authentication
- SSRF protection
- caching behavior
- concurrency/race-sensitive behavior

When fixing a bug, add a regression test whenever practical.

Do not remove or weaken an existing test merely to make the implementation
pass.

## 6. Required Verification

Before considering a change complete, run the project's configured checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
````

Also run configured:

* dependency/security audit
* secret scanning
* formatting checks

If a command does not exist in the project, do not invent or add it merely
to satisfy this document. Use the project's actual scripts.

If a check fails:

1. Determine whether the failure is caused by the change.
2. Fix the problem when it is within scope.
3. Do not bypass, disable, or weaken the check.
4. Report unresolved failures clearly.

## 7. Local Verification

When a change affects HTTP behavior, UI, RSS output, configuration, or
Cloudflare Worker behavior:

* run the appropriate local development environment
* exercise the affected endpoint or workflow
* verify success and relevant failure cases
* inspect generated output where applicable

For RSS changes, verify the generated XML is valid and compatible with the
expected RSS structure.

For UI changes, verify desktop, mobile, keyboard navigation, focus states,
loading, error, and empty states as applicable.

## 8. Documentation

Update documentation when implementation changes:

* public behavior
* configuration
* deployment requirements
* security behavior
* architecture
* development workflow

Record important architectural or technology decisions in
`docs/DECISIONS.md`.

Do not duplicate large sections of documentation unnecessarily.

## 9. Git Workflow

Use normal Git hygiene.

Before committing:

```bash
git status
git diff
```

Review the complete change and remove accidental files or unrelated changes.

Use Conventional Commits:

* `feat:`
* `fix:`
* `security:`
* `refactor:`
* `perf:`
* `docs:`
* `test:`
* `build:`
* `ci:`
* `chore:`

Keep commits focused and logically coherent.

Never commit:

* secrets
* credentials
* tokens
* cookies
* `.env` files containing secrets
* local machine configuration
* generated files that are not intentionally versioned

Do not push to remote repositories unless the current task explicitly
authorizes it.

## 10. Dependencies

Before adding a dependency, verify that it is actually necessary.

Prefer, in order:

1. existing project code
2. Web APIs
3. Cloudflare Workers APIs
4. existing dependencies
5. a new dependency only when justified

When adding a dependency, consider:

* security
* maintenance
* bundle size
* license
* compatibility with Cloudflare Workers
* long-term necessity

Do not add dependencies simply for convenience.

## 11. Scope Control

Do not expand a task unnecessarily.

If unrelated problems are discovered:

* fix them only when they block the current task or create a security risk
* otherwise document them for later work

Do not turn a small fix into an unrelated refactor.

## 12. Completion Criteria

A task is complete when:

* the requested behavior is implemented
* relevant tests exist and pass
* typecheck passes
* lint passes
* build passes
* security-sensitive behavior has been verified where applicable
* documentation is updated when necessary
* `git diff` contains only intentional changes
* `PLANS.md` reflects the actual project state when applicable

Do not declare a task complete merely because the code compiles.

## 13. Failure and Uncertainty

When something fails, investigate before asking the user.

Use the available code, documentation, tests, logs, and project configuration
to determine the most likely cause.

Ask the user only when:

* required credentials or secrets are needed
* an irreversible/destructive action is required
* there is a genuine conflict between requirements
* the decision materially changes cost or scope
* production/public release requires authorization
* the available evidence is insufficient to make a safe decision

Otherwise, make the appropriate engineering decision and proceed.

```
