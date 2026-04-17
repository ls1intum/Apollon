# Publishing the library to npm

Releases are tag-driven and run from the **Release** workflow
(`.github/workflows/release.yml`). Pushing a `v*` tag to `main` publishes
the library to npm (if the version is new), retags the Docker images for
that commit, creates the GitHub Release, and deploys to staging.

## Flow

1. **Bump.** Actions → **Version Bump** → pick a scope and bump type. The
   workflow opens a PR that updates the relevant `package.json` files and
   the root `package-lock.json`.

   | Scope | Bumps |
   | ----- | ----- |
   | `library` | `library/package.json` + `standalone/{webapp,server}/package.json` (standalone follows library) |
   | `standalone` | `standalone/{webapp,server}/package.json` only |

2. **Merge the bump PR.** The push to `main` builds Docker images tagged
   `sha-<commit>` and auto-deploys them to staging.

3. **Tag from `main`** (wait until the push-to-main build is green):

   ```sh
   git checkout main && git pull
   git tag v<version>
   git push origin v<version>
   ```

   The tag version must match the **standalone** version. The library
   version is independent.

4. **Promote to production.** Actions → **Deploy to Production** →
   `image-tag: <version>`.

## Two version tracks, one release tag

| | Source | Artifact |
| - | - | - |
| **Library** | `library/package.json` | `@tumaet/apollon` on npm |
| **Standalone** | `standalone/{webapp,server}/package.json` | `ghcr.io/ls1intum/apollon/apollon-{webapp,server}` Docker images |

The release tag matches the standalone version. The library publishes
only when its version is new on npm — a `standalone`-scope bump cuts a
Docker-only release, and a `library`-scope bump ships both.

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
  image, mismatched versions), delete and re-cut the tag.
- **`publish-library` failed after `npm publish` succeeded** — the next
  run sees the version on npm and skips.
- **`tag-docker-images` partially failed** — `docker buildx imagetools
  create` overwrites pointers; re-run is a no-op on the succeeded legs.
- **`create-release` failed** — re-run updates the existing release
  in-place.
- **`deploy-staging` failed** — Actions → **Deploy to Staging** with the
  same `image-tag`.
