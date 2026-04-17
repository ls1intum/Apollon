# Releases

Two independently versioned artifacts, each with its own release workflow:

| Artifact | Version source | Tag | Workflow |
| -------- | -------------- | --- | -------- |
| `@tumaet/apollon` (npm) | `library/package.json` | `@tumaet/apollon@X.Y.Z` | `release-library.yml` |
| Standalone Docker images | `standalone/{webapp,server}/package.json` | `vX.Y.Z` | `release-standalone.yml` |

Both workflows trigger automatically when their version changes on `main`. There is **one** manual step per release: merge the bump PR.

## Cut a release

1. Actions → **Version Bump** → pick `scope` and bump type. Merge the PR that opens.
   - **`library`** bumps `library/package.json` **and** `standalone/{webapp,server}/package.json` by the same bump type, so a library change ships to npm **and** as a new Docker release from the same PR merge.
   - **`standalone`** bumps only `standalone/{webapp,server}/package.json`; the library is untouched.
2. On merge:
   - `release-library.yml` fires when `library/package.json` changes: `npm publish --provenance` → tag `@tumaet/apollon@X.Y.Z` → GitHub Release. Skipped if the version is already on npm.
   - `release-standalone.yml` fires after the push-to-main Docker build succeeds: retag `sha-<commit>` → `X.Y.Z` → cosign-sign → tag `vX.Y.Z` → GitHub Release. Staging is already running the same digest under the `sha-<commit>` tag from the push-to-main deploy, so no second deploy is needed. Skipped if a release for that version already exists.
3. Promote to production: Actions → **Deploy to Production** → `image-tag: X.Y.Z`.

## Verify a Docker image signature

```sh
cosign verify \
  --certificate-identity-regexp='^https://github\.com/ls1intum/Apollon/\.github/workflows/release-standalone\.yml@refs/heads/main$' \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  ghcr.io/ls1intum/apollon/apollon-server:<version>
```

## One-time setup

- npm trusted publisher on npmjs.com: `ls1intum/Apollon` → `.github/workflows/release-library.yml` → environment `npm-publish` (no `NPM_TOKEN` needed).
- GitHub Environment `npm-publish` with deployment branch rule `refs/heads/main`.
