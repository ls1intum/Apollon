# Releases

Two independently versioned artifacts, each with its own release workflow:

| Artifact | Version source | Tag | Workflow |
| -------- | -------------- | --- | -------- |
| `@tumaet/apollon` (npm) | `library/package.json` | `@tumaet/apollon@X.Y.Z` | `release-library.yml` |
| Standalone Docker images | `standalone/{webapp,server}/package.json` | `vX.Y.Z` | `release-standalone.yml` |

Both workflows trigger automatically when their version changes on `main`. There is **one** manual step per release: merge the bump PR.

## Cut a release

1. Actions → **Version Bump** → pick `scope` (`library` or `standalone`) and bump type. Merge the PR that opens.
2. For a **library** release: `release-library.yml` fires, tags `@tumaet/apollon@X.Y.Z`, runs `npm publish --provenance`, creates the GitHub Release. Skipped if the version is already on npm.
3. For a **standalone** release: `release-standalone.yml` fires after the push-to-main Docker build succeeds, retags `sha-<commit>` → `X.Y.Z`, cosign-signs the images, tags `vX.Y.Z`, creates the GitHub Release, and deploys to staging. Skipped if a release for that version already exists.
4. Promote to production: Actions → **Deploy to Production** → `image-tag: X.Y.Z`.

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
