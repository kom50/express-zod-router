# Releasing `express-zod-router`

This document describes the release process for publishing `express-zod-router` to npm.

## Release principles

`express-zod-router` follows Semantic Versioning:

```text
MAJOR.MINOR.PATCH
```

- **PATCH** (`1.0.1`) — backward-compatible bug fixes, documentation corrections, and internal fixes.
- **MINOR** (`1.1.0`) — new backward-compatible functionality.
- **MAJOR** (`2.0.0`) — breaking changes to the public API or supported behavior.

A Git commit does not require a version change. A version is changed when a release is intentionally prepared.

## Before a release

Make sure the working tree is clean and the intended changes are merged into `main`.

Run the local checks:

```bash
npm install
npm run typecheck
npm run typecheck:security
npm test
npm run build
npm pack --dry-run
```

If documentation has changed, also verify the documentation build:

```bash
npm run docs:build
```

The documentation deployment is handled by `.github/workflows/deploy-docs.yml`.

## Choose the version

Use npm's version command:

```bash
# Bug fixes
npm version patch

# New backward-compatible features
npm version minor

# Breaking changes
npm version major
```

For the first stable release:

```bash
npm version 1.0.0
```

`npm version` updates `package.json` (and the lockfile when present), creates a Git commit, and creates a corresponding Git tag by default.

## Update the changelog

Before publishing, update `CHANGELOG.md` with the release version, date, and user-visible changes.

Keep changelog entries focused on what users need to know. Do not list every internal commit.

## Create the GitHub Release

Push the version commit and tag to GitHub:

```bash
git push origin main
git push origin v1.0.0
```

Replace `v1.0.0` with the actual version.

Then create a GitHub Release using the same tag, for example:

```text
Tag: v1.0.0
Title: v1.0.0
```

Use the corresponding section from `CHANGELOG.md` as the release notes.

## npm publishing

The GitHub Actions release workflow is responsible for publishing the package after a GitHub Release is published.

Workflow:

```text
GitHub Release
      ↓
.github/workflows/release.yml
      ↓
Install dependencies
      ↓
Typecheck
      ↓
Security typecheck
      ↓
Tests
      ↓
Build package
      ↓
npm pack --dry-run
      ↓
npm publish
```

The release workflow uses npm provenance/Trusted Publishing through GitHub Actions. Configure the npm trusted publisher for this repository before the first automated release.

Do not publish manually from a developer machine unless the automated release process is unavailable and a manual release is intentionally required.

## Verify the published package

After the workflow completes, verify the package on npm:

```bash
npm view express-zod-router version
```

Then test installation from the npm registry in a clean project:

```bash
mkdir npm-install-test
cd npm-install-test
npm init -y
npm install express-zod-router express zod
```

Verify that the package can be imported and used successfully.

## Hotfix release

For a backward-compatible bug fix after a release:

```text
Fix
 ↓
Tests
 ↓
CHANGELOG
 ↓
npm version patch
 ↓
GitHub Release
 ↓
npm publish
```

Example:

```text
1.0.0 → 1.0.1
```

## Feature release

For a backward-compatible feature:

```text
Feature
 ↓
Tests + docs
 ↓
CHANGELOG
 ↓
npm version minor
 ↓
GitHub Release
 ↓
npm publish
```

Example:

```text
1.0.1 → 1.1.0
```

## Breaking release

For a breaking public API change:

```text
Breaking change
 ↓
Migration documentation
 ↓
Tests + docs
 ↓
CHANGELOG
 ↓
npm version major
 ↓
GitHub Release
 ↓
npm publish
```

Example:

```text
1.9.0 → 2.0.0
```

Breaking changes should clearly document what changed and how users can migrate.

## Release checklist

Before publishing:

- [ ] CI is passing.
- [ ] Package typecheck passes.
- [ ] Security typecheck passes.
- [ ] Tests pass.
- [ ] Package build passes.
- [ ] `npm pack --dry-run` has been reviewed.
- [ ] Documentation is updated.
- [ ] `CHANGELOG.md` is updated.
- [ ] Correct Semantic Version is selected.
- [ ] Git tag matches the package version.
- [ ] GitHub Release uses the same tag.
- [ ] npm Trusted Publishing is configured.
- [ ] npm publish workflow succeeds.
- [ ] The published package can be installed from npm.

## Release workflow files

- `.github/workflows/ci.yml` — validates code changes.
- `.github/workflows/deploy-docs.yml` — builds and deploys VitePress documentation.
- `.github/workflows/release.yml` — validates and publishes npm releases.
