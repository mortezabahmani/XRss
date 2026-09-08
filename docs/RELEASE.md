
# Release Guide

This document defines the standard release and production deployment process
for XRSS.

## 1. Release Principles

- Releases must be reproducible and traceable.
- Every release corresponds to a specific Git commit and version.
- GitHub Release and Cloudflare production deployment are separate operations.
- Never deploy an unreviewed or unverified build to production.
- Prefer small, focused releases.
- Do not create a release merely because code has changed.
- Do not publish the repository or make it public unless explicitly authorized.

## 2. Versioning

XRSS follows Semantic Versioning:

`MAJOR.MINOR.PATCH`

During initial development, use `0.x.y`.

- `PATCH`: bug fixes, security fixes, internal improvements
- `MINOR`: backward-compatible features or meaningful changes
- `MAJOR`: breaking changes

Do not increment the version arbitrarily.

Choose the version based on the actual user-visible and compatibility impact
of the changes since the previous release.

## 3. Branching

Normal workflow:

```text
feature/fix branch
        ↓
Pull Request
        ↓
CI
        ↓
main
        ↓
release
        ↓
Git tag
        ↓
GitHub Release
        ↓
Production deployment
        ↓
Smoke tests
````

Use short-lived branches where practical.

Do not rewrite shared branch history unless explicitly authorized.

## 4. Release Preconditions

Before creating a release:

* the intended changes are merged
* CI passes
* the working tree is understood and clean
* the target commit is known
* version is correct
* `CHANGELOG.md` is updated
* documentation is updated where necessary
* no secrets are present in the changes
* security-sensitive changes have been reviewed
* the production configuration is compatible with the release

Run the project's configured verification commands:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Also run configured:

* dependency/security checks
* secret scanning
* formatting checks

If a required check fails, do not create the release unless the failure is
understood and explicitly acceptable.

## 5. Changelog

Every release must have a meaningful `CHANGELOG.md` entry.

Include relevant changes such as:

* Added
* Changed
* Fixed
* Security
* Performance
* Removed
* Breaking Changes

Do not include meaningless implementation noise.

Security fixes should be clearly identified when disclosure is appropriate.

## 6. Release Commit

Before tagging:

1. update the version
2. update `CHANGELOG.md`
3. run all verification checks
4. inspect `git diff`
5. inspect `git status`
6. verify the release commit contains only intentional changes

Use a Conventional Commit when creating a release-related commit, if a
separate release commit is required.

## 7. Git Tag

Create an annotated tag corresponding exactly to the released version.

Example:

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
```

The tag must point to the exact commit that was verified for release.

Never move an existing release tag to a different commit.

## 8. GitHub Release

Create a GitHub Release from the corresponding tag.

Release notes should contain:

* version
* summary
* important changes
* security fixes when applicable
* breaking changes
* upgrade/migration notes when applicable

Do not publish the repository itself unless explicitly authorized.

## 9. Production Deployment

Cloudflare Workers is the primary production runtime.

Production deployment must use the exact release artifact/source represented by
the release tag.

Do not deploy:

* uncommitted changes
* an untagged experimental branch
* an unverified build
* local-only configuration

Unless explicitly configured otherwise, production deployment should be
manual or release-triggered rather than occurring on every push to `main`.

Production credentials and secrets must never be stored in Git.

## 10. Deployment Verification

After deployment, perform appropriate smoke tests.

At minimum verify:

* `/` responds correctly
* `/rss` returns valid RSS
* `/health` behaves as expected
* authentication protects admin functionality
* the configured feed can update successfully
* the previous valid feed remains available when an upstream update fails
* no unexpected error or secret information is exposed

For UI changes, also verify:

* admin login/authentication
* configuration pages
* relevant forms
* responsive layout
* error/loading states

Do not consider a deployment successful solely because Cloudflare accepted it.

## 11. Rollback

If a release causes a production regression:

1. identify the last known-good release
2. stop further rollout
3. redeploy the last known-good release
4. verify production behavior
5. document the incident and cause
6. create a fix before attempting the failed release again

Rollback should use a known release rather than ad-hoc source changes.

Do not rewrite history to hide a failed release.

## 12. Database and Storage Changes

Any release that changes persistent storage must explicitly consider:

* schema compatibility
* existing data
* migration order
* rollback safety
* backward compatibility

Do not perform destructive data migrations automatically without an explicit
and reviewed migration strategy.

A release that cannot be safely rolled back must document that limitation
before deployment.

## 13. Secrets and Environment

Production secrets are managed outside Git.

Before deployment verify that required production configuration exists.

Never:

* print secrets
* include secrets in release notes
* put secrets in URLs
* commit `.env` files containing production credentials
* copy production secrets into source code

Do not change production secrets as part of a normal release unless the task
explicitly requires it.

## 14. Failed Releases

If release preparation fails:

* do not create a misleading tag
* do not publish an incomplete GitHub Release
* fix the underlying issue
* rerun verification

If a tag or release has already been published incorrectly, preserve the
history and correct it through a new release rather than silently rewriting
published history.

## 15. Release Scope

A release should contain only changes intended for that release.

Do not include:

* unrelated refactors
* experimental features
* temporary debugging code
* local configuration
* generated artifacts that are not intentionally released

If unrelated changes are discovered, leave them for a separate change unless
they are required to make the release safe.

## 16. Release Checklist

Before release:

* [ ] Correct version selected
* [ ] Changes reviewed
* [ ] Tests pass
* [ ] Typecheck passes
* [ ] Lint passes
* [ ] Build passes
* [ ] Security/dependency checks pass
* [ ] Secret scan passes
* [ ] `CHANGELOG.md` updated
* [ ] Documentation updated
* [ ] Working tree reviewed
* [ ] Release commit verified
* [ ] Git tag created from verified commit
* [ ] GitHub Release created
* [ ] Production deployment authorized

After deployment:

* [ ] Smoke tests pass
* [ ] RSS endpoint verified
* [ ] Health endpoint verified
* [ ] Admin authentication verified
* [ ] Feed update verified
* [ ] No unexpected errors observed

## 17. Automation

Automate repetitive and deterministic release checks where practical.

Automation must not:

* bypass required verification
* expose secrets
* deploy unexpectedly
* publish the repository
* make destructive changes without explicit authorization

The release process should remain understandable and reproducible even when
automation is unavailable.

````

