# XRSS Agent Instructions

## Mission

Build and maintain XRSS according to the project architecture,
security model, UI/UX principles, and development workflow documented
in /docs and PLANS.md.

## Autonomous Execution

Do not ask the user for confirmation for routine development decisions.

Make reasonable engineering decisions autonomously when:
- the decision is reversible;
- it does not expose secrets;
- it does not change the product scope;
- it does not destroy user data;
- it does not incur unexpected external cost;
- it does not publish or release a production version.

Ask the user only when:
- requirements genuinely conflict;
- an irreversible/destructive action is required;
- credentials or sensitive information are required;
- a paid service or unexpected cost is required;
- product scope must materially change;
- a security boundary must be weakened;
- an external public release requires explicit approval.

## Workflow

Before implementation:
1. Read AGENTS.md.
2. Read the relevant documentation in /docs.
3. Read PLANS.md.
4. Inspect the existing codebase.
5. Create/update the implementation plan if necessary.

During implementation:
- Work autonomously.
- Prefer the simplest correct solution.
- Do not repeatedly ask about small implementation choices.
- Follow existing architecture and conventions.
- Do not introduce dependencies without justification.

After implementation:
1. Run tests.
2. Run typecheck.
3. Run lint.
4. Run build.
5. Run security checks.
6. Review git diff.
7. Report failures clearly.

## Git

Use Conventional Commits.

Never commit:
- secrets
- credentials
- cookies
- tokens
- .env files
- personal configuration

Do not push or publish unless the task explicitly authorizes it.

## UI

The UI must follow the project's UI/UX specification.

Use the installed:
- Impeccable
- Hallmark
- Anti-UI-Slop

skills when designing or reviewing UI.

Do not create generic AI-generated dashboard aesthetics.

Prefer:
- clarity
- restraint
- hierarchy
- accessibility
- consistency
- functional UI

over decoration.

## Security

Treat all external/provider data as untrusted.

Never weaken:
- authentication
- authorization
- input validation
- output encoding
- XSS protection
- XML safety
- SSRF protection
- secret handling
- rate limiting
- least privilege

## Completion

A task is not complete until:
- implementation is finished;
- tests pass;
- typecheck passes;
- lint passes;
- build passes;
- security checks pass;
- documentation is updated when necessary.