# Releases

Apollon ships **two independently versioned artifacts** from this
monorepo:

| Artifact | Source | Version format | Tag | Release pipeline |
| -------- | ------ | -------------- | --- | ---------------- |
| **`@tumaet/apollon`** (npm library) | `library/package.json` | SemVer | `@tumaet/apollon@X.Y.Z` | `release-library.yml` → npm publish with OIDC + provenance + GitHub Release |
| **Standalone** (webapp + server Docker images) | `standalone/{webapp,server}/package.json` | SemVer | `vX.Y.Z` | `release-standalone.yml` → Docker retag + cosign + GitHub Release + staging deploy |

The two tracks move on their own schedules. A server-only fix bumps
standalone without touching the library; a library-only fix publishes
to npm without redeploying the webapp. When the standalone rolls in a
new library version, that's a standalone bump like any other.

## Flow

1. **Bump.** Actions → **Version Bump** → pick `scope` (library or
   standalone) and bump type. The workflow opens a PR that bumps only
   the relevant `package.json` files and regenerates the lockfile.

2. **Merge the bump PR.** The push to `main` builds Docker images
   tagged `sha-<commit>` and auto-deploys them to staging. (This
   happens on every push to main regardless of scope; staging always
   tracks `main`.)

3. **Cut the release tag from `main`.** Wait until the push-to-main
   Docker build is green (only required for standalone releases), then:

   ```sh
   git checkout main && git pull

   # Library release:
   git tag '@tumaet/apollon@X.Y.Z'
   git push origin '@tumaet/apollon@X.Y.Z'

   # Standalone release:
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

4. **Promote a standalone release to production.** Actions → **Deploy
   to Production** → `image-tag: X.Y.Z`.

## Supply chain

- Library published with `--provenance` via npm OIDC trusted
  publishing. The npm page carries a "Built and signed on GitHub
  Actions" badge linked to the Sigstore transparency log.
- Docker images cosign-signed keyless via OIDC on retag. Verify with:

  ```sh
  cosign verify \
    --certificate-identity-regexp='^https://github\.com/ls1intum/Apollon/\.github/workflows/release-standalone\.yml@refs/tags/v.*$' \
    --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
    ghcr.io/ls1intum/apollon/apollon-server:<version>
  ```

## Prerequisites

- **npm trusted publisher** configured on npmjs.com for
  `ls1intum/Apollon` → `.github/workflows/release-library.yml` →
  environment `npm-publish`.
- **GitHub Environment `npm-publish`** with the deployment branch rule
  scoped to `refs/tags/@tumaet/apollon@*`.
- **Tag only after** the push-to-main Docker build for that commit has
  finished green (standalone releases only — library releases don't
  need Docker images).
- **Tags are strict SemVer, monotonic, and single-use.** The workflows
  reject prerelease (`-rc.1`), build-metadata (`+…`), non-monotonic,
  or re-used tag names.

## Recovery

Every step is idempotent; re-running a failed release is safe:

- **`verify` failed** — fix the input (tag not on main, version
  mismatch, missing Docker image) and **bump to the next version**;
  the workflow refuses to re-run a tag that already has a GitHub
  Release.
- **`publish` failed after `npm publish` succeeded** — the next run's
  `verify` sees the version on npm and skips.
- **`tag-docker-images` partially failed** — `docker buildx imagetools
  create` overwrites pointers; re-run is a no-op on the succeeded
  legs.
- **`create-release` failed** — re-run updates the existing release
  in-place.
- **`deploy-staging` failed** — Actions → **Deploy to Staging** with
  the same `image-tag`.
