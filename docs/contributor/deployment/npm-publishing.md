---
id: npm-publishing
title: Releases
description: How the three independently versioned Apollon artifacts ship — npm, Docker, VS Marketplace.
---

# Releases

Three independently versioned artifacts, each with its own release workflow:

| Artifact                                             | Version source                            | Tag                     | Workflow                       |
| ---------------------------------------------------- | ----------------------------------------- | ----------------------- | ------------------------------ |
| `@tumaet/apollon` (npm)                              | `library/package.json`                    | `@tumaet/apollon@X.Y.Z` | `release-library.yml`          |
| Standalone Docker images                             | `standalone/{webapp,server}/package.json` | `vX.Y.Z`                | `release-standalone.yml`       |
| `aet-tum.apollon-vscode` (VS Marketplace + Open VSX) | `vscode-extension/package.json`           | `apollon-vscode@X.Y.Z`  | `release-vscode-extension.yml` |

Standalone starts at `4.2.18` (the library version at the time of the release-pipeline switchover). Future `vX.Y.Z` tags advance from there and do not collide with legacy tags.

All three tracks are versioned by [Changesets](https://github.com/changesets/changesets), and all three share one number: `@tumaet/apollon`, the standalone pair and `apollon-vscode` sit in a single `fixed` group (`.changeset/config.json`), so a release advances them together. The publish workflows trigger automatically when their version changes on `main`. There is **one** manual step per release: merge the version PR.

The cost of that group is worth naming: a changeset touching only the extension still bumps and republishes the library and the standalone images at the new version, with identical content. A `linked` group would avoid that at the price of the numbers drifting apart. One product number was the deliberate trade.

`apollon-vscode` ships to the VS Marketplace, never to npm. Nothing publishes it there today — `release.yml` runs Changesets in version-only mode — and a `publish` input must never be added to it.

The per-PR side is Changesets: authors run `pnpm changeset` on every user-visible PR to record a changelog entry with its bump type (see [Release notes](/contributor/development/release-notes)). On every push to `main`, `release.yml` runs [`changesets/action`](https://github.com/changesets/action) in **version-only** mode (no `publish` input — the bespoke `release-*.yml` workflows own publishing) and opens or updates a single **Version Packages** PR. That PR runs `pnpm changeset:version`, which:

- consumes the accumulated `.changeset/*.md` files and bumps `@tumaet/apollon` and the paired `@tumaet/webapp` + `@tumaet/server` from the **declared** bump types — no human picks a bump;
- bumps `@tumaet/apollon`, the standalone pair and `apollon-vscode` to one shared version, taking the largest bump any of them earned. `scripts/cascade-standalone-bump.mjs` still runs first and raises the standalone's floor to the library's bump; inside a `fixed` group that floor is already met, so it is a safety net rather than the mechanism. Because the group is fixed, a bump earned by **any** member raises all of them — a standalone-only or extension-only change does drag the library up, which is the price of one product number. So a library change always ships to npm **and** as a comparable Docker release **and** as a Marketplace release from the same merge;
- regenerates every `CHANGELOG.md`, rewrites the pinned `@tumaet/apollon@X.Y.Z` CDN URLs (via `scripts/sync-library-version.mjs`), and refreshes the lockfile.

The GitHub Release body for each track is built from that `CHANGELOG.md` section (via `scripts/extract-changelog.mjs`), **regrouped by category** — Features, Bug Fixes, Performance, … — from each entry's Conventional Commit type (resolved from the commit SHA via git; full history is checked out for this, falling back to the semver bump when git can't resolve it) instead of the raw `### Minor/Patch Changes` bump headings (see [Release notes](/contributor/development/release-notes#how-your-change-gets-grouped)); it falls back to GitHub's auto-generated notes only when a version carried no changeset. PR Health Checks also run `sync-library-version.mjs --check`, so a CDN-URL drift can never merge — run `pnpm sync:version` locally to fix one.

## Cut a release

1. Let the **Version Packages** PR (titled `chore: version packages`, opened by `release.yml`) accumulate as changesets land, then **merge it** when you want to cut a release. The library, the paired standalone packages and the VS Code extension bump together; merging is the only manual step.
2. On merge:
   - `release-library.yml` fires when `library/package.json` changes: builds with pnpm, packs the tarball with `pnpm pack`, publishes with `npm publish` for OIDC trusted publishing + provenance (pnpm does not yet support OIDC trusted publishing natively — tracked in [pnpm#9812](https://github.com/pnpm/pnpm/issues/9812)). Tags `@tumaet/apollon@X.Y.Z` → GitHub Release. Skipped if the version is already on npm.
   - `release-standalone.yml` fires after the push-to-main Docker build succeeds: retag `sha-<commit>` → `X.Y.Z` → cosign-sign → tag `vX.Y.Z` → GitHub Release. Staging is already running the same digest under the `sha-<commit>` tag from the push-to-main deploy, so no second deploy is needed. Skipped if a release for that version already exists.
   - `release-vscode-extension.yml` fires when the `version` in `vscode-extension/package.json` changes: builds the library + extension, packages the VSIX, attests it via sigstore (`actions/attest-build-provenance`), then publishes to the VS Marketplace (`vsce`) and, when `OVSX_PAT` is set, to Open VSX (`ovsx`) — both gated on the `vscode-marketplace` environment. Tags `apollon-vscode@X.Y.Z` → GitHub Release with the VSIX attached. Any other edit to the manifest, including the `publisher` and `name` that decide the Marketplace identity, is picked up by the next release rather than triggering one; publish it with a `workflow_dispatch`.
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

The extension publishes as `aet-tum.apollon-vscode`, from the `publisher` and `name` fields of `vscode-extension/package.json`. `aet-tum` is the organization's publisher — the one that also owns `aet-tum.iris-thaumantias`.

- **Azure DevOps PAT** (required): create at `https://dev.azure.com/<your-org>/_usersSettings/tokens` with scope `Marketplace → Manage`, organization "All accessible organizations". Max lifetime is 1 year — calendar a rotation reminder. The PAT's account must be a member of the `aet-tum` publisher: a token that is valid but not a member fails with `Access Denied … needs the following permission(s) on the resource /aet-tum/apollon-vscode`. Check with `vsce verify-pat aet-tum`; the release workflow runs the same command before it uploads anything.
- **Open VSX PAT** (optional): create at `https://open-vsx.org/user-settings/tokens`. When `OVSX_PAT` is unset the release skips Open VSX and publishes to the Marketplace alone; the workflow logs a notice and stays green. The namespace `aet-tum` must exist on Open VSX — verify at `https://open-vsx.org/namespace/aet-tum`, and if it is missing run `ovsx create-namespace aet-tum -p <PAT>` once locally.
- **GitHub Environment `vscode-marketplace`**:
  - Settings → Environments → New environment → name `vscode-marketplace`.
  - Deployment branches and tags → "Selected branches and tags" → add `main`.
  - Required reviewers → add the release maintainer; turn on "Prevent self-review" if a second maintainer is available.
  - Environment secrets:
    - `VSCE_PAT` = Azure DevOps PAT (above).
    - `OVSX_PAT` = Open VSX PAT (above), if Open VSX is wanted.
  - Delete any pre-existing repo-level `VSCE_PAT` / `OVSX_PAT` after the environment-scoped ones are in place — repo secrets bypass the environment's deployment-branch and reviewer gates.
