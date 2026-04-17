# Releases

Apollon uses **fixed versioning**: one version string, lived in
`library/package.json`, shared across the library (`@tumaet/apollon` on
npm) and the standalone Docker images. Release tags are `v<version>`;
the tag, the npm version, and the Docker image tags are all the same
number.

## Flow

1. **Bump.** Actions → **Version Bump** → pick a bump type
   (`patch`/`minor`/`major`). The workflow bumps `library/package.json`
   and syncs `standalone/{webapp,server}/package.json` to the same
   number, regenerates the lockfile, and opens a PR.

2. **Merge the bump PR.** The push to `main` builds Docker images tagged
   `sha-<commit>` and auto-deploys them to staging.

3. **Tag from `main`** (wait until the push-to-main build is green):

   ```sh
   git checkout main && git pull
   git tag v<version>
   git push origin v<version>
   ```

4. **Promote to production.** Actions → **Deploy to Production** →
   `image-tag: <version>`.

## One version, two artifacts

| | Source | Artifact |
| - | - | - |
| **Library** | `library/package.json` (source of truth) | `@tumaet/apollon` on npm |
| **Standalone** | `standalone/{webapp,server}/package.json` (syncs to library) | `ghcr.io/ls1intum/apollon/apollon-{webapp,server}` Docker images |

The `Release` workflow enforces this: it refuses to run unless the tag
matches `library/package.json`, and standalone matches library.

## Server-only and webapp-only hotfixes

Fixed versioning means **a standalone-only fix still bumps the shared
version and republishes the library**. The library tarball is
content-identical to the previous release, but the version number
advances in lockstep with the monorepo. `npm publish` is idempotent in
this pipeline — `verify-version` checks the registry first and skips
the publish step if the library version is already live, so even a
redundant invocation is safe. This matches what Storybook, React, Vite,
and similar product-shaped monorepos do.

Rationale: the tag, the npm page, and the Docker image tags all share a
number. A reader seeing `v4.2.20` on GitHub, npm, and the production
image has one mental model — not three.

## Prerequisites

- **npm trusted publisher** configured on npmjs.com for
  `ls1intum/Apollon` → `.github/workflows/release.yml` → environment
  `npm-publish`. No `NPM_TOKEN` secret needed; `--provenance` is attested.
- **GitHub Environment `npm-publish`** with the deployment branch rule
  scoped to `refs/tags/v*`.
- **Tag only after** the push-to-main Docker build for that commit has
  finished green — the release workflow will fail fast otherwise.

## Recovery

Every step is idempotent; re-running a failed release is safe:

- **`verify-version` failed** — fix the input (tag not on main, missing
  image, version mismatch between library and standalone), delete and
  re-cut the tag.
- **`publish-library` failed after `npm publish` succeeded** — the next
  run sees the version on npm and skips.
- **`tag-docker-images` partially failed** — `docker buildx imagetools
  create` overwrites pointers; re-run is a no-op on the succeeded legs.
- **`create-release` failed** — re-run updates the existing release
  in-place.
- **`deploy-staging` failed** — Actions → **Deploy to Staging** with the
  same `image-tag`.
