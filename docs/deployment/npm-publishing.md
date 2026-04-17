# Publishing the library to npm

The `@tumaet/apollon` library is published to npm by the **Release** workflow
(`.github/workflows/release.yml`) whenever a tag matching `v*` is pushed to
`main`. There are no local publish scripts — the flow is entirely
GitHub-driven.

## Trust model

- npm publishing uses **OIDC trusted publishing** via the `npm-publish` GitHub
  Environment. No `NPM_TOKEN` secret is used.
- Provenance is attested (`npm publish --provenance`), so the npm page shows
  "Built and signed on GitHub Actions".
- The trusted publisher configuration on npmjs.com must include this
  repository and the `Release` workflow.

## End-to-end flow

1. **Bump versions.** Actions → **Version Bump** → pick a scope and bump type.
   The workflow opens a PR that updates the relevant `package.json` files
   and the root `package-lock.json`.

   | Scope | What it bumps | When |
   | ----- | ------------- | ---- |
   | `library` | `library/package.json` + both `standalone/*/package.json` (standalone follows library) | Library code changed |
   | `standalone` | Only `standalone/webapp/package.json` and `standalone/server/package.json` | Server or webapp change, library unchanged |

2. **Merge the bump PR.** Push to `main` triggers the normal
   **Build and Push Docker Image** workflow, which tags images as
   `sha-<commit>` and auto-deploys them to staging.

3. **Cut the release tag from `main`:**

   ```sh
   git checkout main && git pull
   git tag v<version>
   git push origin v<version>
   ```

   The tag version must match the **standalone** version; the library version
   is independent and published only when it is new on npm.

4. **The `Release` workflow:**
   - Verifies the tag commit is an ancestor of `main`.
   - Verifies `library` / `standalone` versions match the tag.
   - Verifies both Docker images `sha-<commit>` exist in GHCR.
   - Publishes the library to npm with provenance (skipped if the version is
     already on the registry).
   - Retags Docker images from `sha-<commit>` to `<version>`.
   - Creates a GitHub Release with auto-generated notes + a footer that pins
     the library version and Docker image tags.
   - Deploys `<version>` to staging.

5. **Promote to production.** Actions → **Deploy to Production** → enter the
   image tag (e.g. `4.2.19`) and run.

## Version-tracking model

Two independent version streams:

| | Source | Artifact |
| - | - | - |
| **Library** | `library/package.json` | `@tumaet/apollon` on npm |
| **Standalone** | `standalone/{webapp,server}/package.json` | `ghcr.io/ls1intum/apollon/apollon-{webapp,server}` Docker images |

The release tag always matches the standalone version. The library version is
published when it is not already on npm — so a `standalone`-scope bump cuts a
new Docker release without republishing the library, and a `library`-scope bump
publishes a new npm version and ships the same version to Docker in a single
tag.

## No alpha / prerelease flow

The previous `prepatch --preid=alpha` workflow has been retired. If you need a
prerelease channel, introduce it deliberately (new `dist-tag`, dedicated
workflow) rather than ad-hoc — the current pipeline assumes stable releases on
the `latest` tag.
