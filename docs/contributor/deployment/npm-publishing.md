---
id: npm-publishing
title: Releases
description: How the three independently versioned Apollon artifacts ship — npm, Docker, VS Marketplace.
---

# Releases

Three independently versioned artifacts, each with its own release workflow:

| Artifact                                            | Version source                            | Tag                     | Workflow                       |
| --------------------------------------------------- | ----------------------------------------- | ----------------------- | ------------------------------ |
| `@tumaet/apollon` (npm)                             | `library/package.json`                    | `@tumaet/apollon@X.Y.Z` | `release-library.yml`          |
| Standalone Docker images                            | `standalone/{webapp,server}/package.json` | `vX.Y.Z`                | `release-standalone.yml`       |
| `tumaet.apollon-vscode` (VS Marketplace + Open VSX) | `vscode-extension/package.json`           | `apollon-vscode@X.Y.Z`  | `release-vscode-extension.yml` |

Standalone starts at `4.2.18` (the library version at the time of the release-pipeline switchover). Future `vX.Y.Z` tags advance from there and do not collide with legacy tags.

All three tracks are versioned by [Changesets](https://github.com/changesets/changesets), and all three share one number: `@tumaet/apollon`, the standalone pair and `apollon-vscode` sit in a single `fixed` group (`.changeset/config.json`), so a release advances them together. The publish workflows trigger automatically when their version changes on `main`. There is **one** manual step per release: merge the version PR.

The cost of that group is worth naming: a changeset touching only the extension still bumps and republishes the library and the standalone images at the new version, with identical content. A `linked` group would avoid that at the price of the numbers drifting apart. One product number was the deliberate trade.

`apollon-vscode` ships to the VS Marketplace, never to npm. Nothing publishes it there today — `release.yml` runs Changesets in version-only mode — and a `publish` input must never be added to it.

The per-PR side is Changesets: authors run `pnpm changeset` on every user-visible PR to record a changelog entry with its bump type (see [Release notes](/contributor/development/release-notes)). On every push to `main`, `release.yml` runs [`changesets/action`](https://github.com/changesets/action) in **version-only** mode (no `publish` input — the bespoke `release-*.yml` workflows own publishing) and opens or updates a single **Version Packages** PR. That PR runs `pnpm changeset:version`, which:

- consumes the accumulated `.changeset/*.md` files and bumps `@tumaet/apollon` and the paired `@tumaet/webapp` + `@tumaet/server` from the **declared** bump types — no human picks a bump;
- keeps the standalone app's bump **at least as large as the library's**: a library minor → standalone minor, a library major → standalone major (via `scripts/cascade-standalone-bump.mjs`, which runs first and raises a floor only — the standalone can still bump higher on its own app-only changes, and the library is never dragged up). So a library change always ships to npm **and** as a comparable Docker release from the same merge;
- regenerates every `CHANGELOG.md`, rewrites the pinned `@tumaet/apollon@X.Y.Z` CDN URLs (via `scripts/sync-library-version.mjs`), and refreshes the lockfile.

The GitHub Release body for each track is built from that `CHANGELOG.md` section (via `scripts/extract-changelog.mjs`), **regrouped by category** — Features, Bug Fixes, Performance, … — from each entry's Conventional Commit type (resolved from the commit SHA via git; full history is checked out for this, falling back to the semver bump when git can't resolve it) instead of the raw `### Minor/Patch Changes` bump headings (see [Release notes](/contributor/development/release-notes#how-your-change-gets-grouped)); it falls back to GitHub's auto-generated notes only when a version carried no changeset. PR Health Checks also run `sync-library-version.mjs --check`, so a CDN-URL drift can never merge — run `pnpm sync:version` locally to fix one.

## Cut a release

1. Let the **Version Packages** PR (titled `chore: version packages`, opened by `release.yml`) accumulate as changesets land, then **merge it** when you want to cut a release. The library, the paired standalone packages and the VS Code extension bump together; merging is the only manual step.
2. On merge:
   - `release-library.yml` fires when `library/package.json` changes: builds with pnpm, packs the tarball with `pnpm pack`, publishes with `npm publish` for OIDC trusted publishing + provenance (pnpm does not yet support OIDC trusted publishing natively — tracked in [pnpm#9812](https://github.com/pnpm/pnpm/issues/9812)). Tags `@tumaet/apollon@X.Y.Z` → GitHub Release. Skipped if the version is already on npm.
   - `release-standalone.yml` fires after the push-to-main Docker build succeeds: retag `sha-<commit>` → `X.Y.Z` → cosign-sign → tag `vX.Y.Z` → GitHub Release. Staging is already running the same digest under the `sha-<commit>` tag from the push-to-main deploy, so no second deploy is needed. Skipped if a release for that version already exists.
   - `release-vscode-extension.yml` fires when `vscode-extension/package.json` changes: builds the library + extension, packages the VSIX, attests it via sigstore (`actions/attest-build-provenance`), then publishes to both VS Marketplace (`vsce`) and Open VSX (`ovsx`) gated on the `vscode-marketplace` environment. Tags `apollon-vscode@X.Y.Z` → GitHub Release with the VSIX attached.
3. Promote standalone to production: Actions → **Deploy to Production** → `image-tag: X.Y.Z`.

## Verify a Docker image signature

```sh
cosign verify \
  --certificate-identity-regexp='^https://github\.com/ls1intum/Apollon/\.github/workflows/release-standalone\.yml@refs/heads/main$' \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  ghcr.io/ls1intum/apollon/server:<version>
```

## One-time setup

### npm (library)

- npm trusted publisher on npmjs.com: `ls1intum/Apollon` → `.github/workflows/release-library.yml` → environment `npm-publish` (no `NPM_TOKEN` needed).
- GitHub Environment `npm-publish` with deployment branch rule `refs/heads/main`.

### VS Marketplace + Open VSX (vscode-extension)

- **Azure DevOps PAT**: create at `https://dev.azure.com/<your-org>/_usersSettings/tokens` with scope `Marketplace → Manage`, organization "All accessible organizations". Max lifetime is 1 year — calendar a rotation reminder.
- **Open VSX PAT**: create at `https://open-vsx.org/user-settings/tokens`. The namespace `tumaet` must exist on Open VSX first — if it doesn't, run `ovsx create-namespace tumaet -p <PAT>` once locally (or have any namespace member do it). Verify at `https://open-vsx.org/namespace/tumaet`.
- **GitHub Environment `vscode-marketplace`**:
  - Settings → Environments → New environment → name `vscode-marketplace`.
  - Deployment branches and tags → "Selected branches and tags" → add `main`.
  - Required reviewers → add the release maintainer; turn on "Prevent self-review" if a second maintainer is available.
  - Environment secrets:
    - `VSCE_PAT` = Azure DevOps PAT (above).
    - `OVSX_PAT` = Open VSX PAT (above).
  - Delete any pre-existing repo-level `VSCE_PAT` / `OVSX_PAT` after the environment-scoped ones are in place — repo secrets bypass the environment's deployment-branch and reviewer gates.
