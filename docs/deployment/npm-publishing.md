# Releases

Three independently versioned artifacts, each with its own release workflow:

| Artifact | Version source | Tag | Workflow |
| -------- | -------------- | --- | -------- |
| `@tumaet/apollon` (npm) | `library/package.json` | `@tumaet/apollon@X.Y.Z` | `release-library.yml` |
| Standalone Docker images | `standalone/{app,server}/package.json` | `vX.Y.Z` | `release-standalone.yml` |
| `tumaet.apollon-vscode` (VS Marketplace + Open VSX) | `vscode-extension/package.json` | `apollon-vscode@X.Y.Z` | `release-vscode-extension.yml` |

Standalone starts at `4.2.18` (the library version at the time of the release-pipeline switchover). Future `vX.Y.Z` tags advance from there and do not collide with legacy tags.

All three workflows trigger automatically when their version changes on `main`. There is **one** manual step per release: merge the bump PR.

## Cut a release

1. Actions → **Version Bump** → pick `scope` and bump type. Merge the PR that opens.
   - **`library`** bumps `library/package.json` **and** `standalone/{app,server}/package.json` by the same bump type, so a library change ships to npm **and** as a new Docker release from the same PR merge.
   - **`standalone`** bumps only `standalone/{app,server}/package.json`; the library is untouched.
   - **`vscode-extension`** bumps only `vscode-extension/package.json`; library and standalone are untouched.
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
