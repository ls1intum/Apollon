---
id: npm-publishing
title: Releases
description: How Apollon releases ship — npm, Docker, and VS Marketplace.
---

# Releases

Changesets gives the library, standalone app, and VS Code extension one product
version through the `fixed` group in `.changeset/config.json`. Each release track
has its own workflow and approval policy. Release workflows use GitHub's
[maximum concurrency queue](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
to retain pending releases instead of replacing them.

| Artifact                 | Version source                            | Tag                       | Workflow                       |
| ------------------------ | ----------------------------------------- | ------------------------- | ------------------------------ |
| `@tumaet/apollon`        | `library/package.json`                    | `@tumaet/apollon@X.Y.Z`   | `release-library.yml`          |
| Standalone Docker images | `standalone/{webapp,server}/package.json` | `vX.Y.Z`                  | `release-standalone.yml`       |
| VS Code extension        | `vscode-extension/package.json`           | `apollon-extension@X.Y.Z` | `release-vscode-extension.yml` |

Authors run `pnpm changeset` for user-visible changes. The version workflow uses
Changesets in version-only mode to create the **Version Packages** PR. Its
`pnpm changeset:version` command updates package versions, changelogs, pinned CDN
URLs, and the lockfile. Release notes come from those changelogs through
`scripts/extract-changelog.mjs`. See [Release notes](/contributor/development/release-notes).

## Cut a release

1. Merge the **Version Packages** PR when the accumulated changes are ready.
2. The release workflows start:
   - **Library:** lint, build, test, pack, and check the tarball as an external
     consumer. A separate job verifies its SHA-512 integrity and stages it on
     npm with OIDC, provenance, and the `next` tag. The artifact name includes
     the run attempt; its immutable ID is shown in the staging summary. No npm
     version is public and no GitHub Release is created at this point.
   - **Standalone:** after the Docker build succeeds, retag its source-pinned
     images, sign them with cosign, and create the `vX.Y.Z` release. The existing
     staging deployment uses the same image digests.
   - **Extension:** build and attest the VSIX, publish to VS Marketplace and
     optionally Open VSX, then create its release with the VSIX attached.
3. Review the library in npm's **Staged Packages** tab. Check the version, source,
   provenance, contents, and `next` tag. Download the staged tarball and compare
   its SHA-512 integrity with the original artifact's `manifest.json`. Approve
   on npm with **2FA**. The version is now public under `next`; `latest` has not
   changed.
4. Run **Release Library** on branch `main`, operation `finalize`, with the
   original `artifact_id` from the staging summary or upload artifact URL.
   Finalization checks the artifact's source run and verifies that npm contains
   the exact tested tarball. A separate OIDC job promotes newer versions to
   `latest`; older or already-promoted versions cannot move it backwards.
   The GitHub Release is prepared as a draft, its uploaded tarball is downloaded
   and compared byte-for-byte, and only then is the release made public.
   Standalone remains the repository's latest GitHub Release.
5. Promote standalone through **Deploy to Production**, with `image-tag: X.Y.Z`.

Docs builds continue during npm review, but production deployment waits until
all pinned library links refer to a public npm version. A successful library
release workflow starts a new docs check. Docker and Marketplace releases do
not wait for npm approval: they consume the library from the workspace.

## Version PR setup

The version workflow uses GitHub's built-in, short-lived `GITHUB_TOKEN`.
No separate GitHub App, private key, or personal access token is required.
Restrict the `version-pr` environment to deployment branch `main`. In the
repository's Actions settings, enable **Allow GitHub Actions to create and
approve pull requests**. The workflow does not approve or merge its own PR.

[Changesets v2](https://github.com/changesets/action) creates the version PR
and pushes signed commits through GitHub's API. GitHub places CI runs for
PRs created or updated with `GITHUB_TOKEN` in an approval-required state.
A maintainer must select **Approve workflows to run** on the PR, wait for all
required checks, then review and merge it normally. Repeat CI approval after
an automated update when GitHub requests it. Never bypass required checks.
See [GitHub's token event rules](https://docs.github.com/en/actions/concepts/security/github_token).

Versioning does not publish packages or tags. The separate release workflows
handle publication after the version PR is merged; npm staging still needs
package-owner approval.

## npm setup

Configure two trusted publisher connections for `ls1intum/Apollon`, workflow
filename `release-library.yml`:

| GitHub environment | npm allowed actions                                         |
| ------------------ | ----------------------------------------------------------- |
| `npm-publish`      | Stage publishing only; no direct publish or dist-tag access |
| `npm-promote`      | Stage publishing and dist-tag access; no direct publish     |

npm always permits staging on new trusted publisher connections. The promotion
connection needs dist-tag permission, but its job only changes the tag after
verification. Restrict both GitHub environments to branch `main`. Protect
`main` and require review of release code. Environment reviewers can provide an
additional gate; they do not replace npm approval.

In npm package Settings → Publishing access, select **Require two-factor
authentication and disallow tokens**. Remove unused trusted publishers and
revoke automation tokens. Do not add long-lived npm credentials to this workflow.
Enable 2FA for release maintainers and keep account recovery credentials secure.

The workflow pins an npm CLI that supports both staging and OIDC dist-tag
operations. These permissions are independent of direct publishing. See
[npm trusted publishers](https://docs.npmjs.com/trusted-publishers/) and
[npm stage](https://docs.npmjs.com/cli/v12/commands/npm-stage).

## npm recovery

| Failure                                                       | Recovery                                                                                                                                                                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build or consumer check                                       | Fix the source and rerun. Each build attempt gets a new artifact ID.                                                                                                                                                                  |
| Duplicate stage or lost upload response                       | Inspect with interactive `npm stage list`, `view`, and `download`. If the bytes match the original artifact, approve and finalize with that artifact ID, even if staging reported a failure. Do not assume a conflict proves success. |
| Wrong staged contents                                         | Reject with `npm stage reject <stage-id>` and 2FA. Fix the source through review before staging again.                                                                                                                                |
| Approval pending, registry unavailable, or integrity mismatch | Finalization stops before promotion or release. Resolve the cause and retry with the original artifact ID.                                                                                                                            |
| `latest` changed during finalization                          | Retry. Verification reads the current tag again; older versions are not promoted.                                                                                                                                                     |
| Upload or draft publication failed                            | Retry with the same artifact ID. Draft assets are repaired and verified before publication. An existing public release is checked, not modified.                                                                                      |
| Conflicting source tag or public release asset                | Stop and investigate. Finalization does not overwrite a conflicting public release.                                                                                                                                                   |
| Original artifact expired or deleted                          | Stop. Artifacts are retained for 90 days; finalization requires the original bytes, not a rebuild.                                                                                                                                    |

## Verify a Docker image signature

```sh
cosign verify \
  --certificate-identity-regexp='^https://github\.com/ls1intum/Apollon/\.github/workflows/release-standalone\.yml@refs/heads/main$' \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  ghcr.io/ls1intum/apollon/server:<version>
```

## Marketplace setup

### VS Marketplace + Open VSX (vscode-extension)

The extension publishes as `aet-tum.apollon-extension`, from the `publisher` and `name` fields of `vscode-extension/package.json`. `aet-tum` is the organization's publisher — the one that also owns `aet-tum.iris-thaumantias`.

- **Azure DevOps PAT** (required): create at `https://dev.azure.com/<your-org>/_usersSettings/tokens` with scope `Marketplace → Manage`, organization "All accessible organizations". Max lifetime is 1 year — calendar a rotation reminder. The PAT's account must be a member of the `aet-tum` publisher: a token that is valid but not a member fails with `Access Denied … needs the following permission(s) on the resource /aet-tum/apollon-extension`. Check with `vsce verify-pat aet-tum`; the release workflow runs the same command before it uploads anything.
- **Open VSX PAT** (optional): create at `https://open-vsx.org/user-settings/tokens`. When `OVSX_PAT` is unset the release skips Open VSX and publishes to the Marketplace alone; the workflow logs a notice and stays green. The namespace `aet-tum` must exist on Open VSX — verify at `https://open-vsx.org/namespace/aet-tum`, and if it is missing run `ovsx create-namespace aet-tum -p <PAT>` once locally.
- **GitHub Environment `vscode-marketplace`**:
  - Settings → Environments → New environment → name `vscode-marketplace`.
  - Deployment branches and tags → "Selected branches and tags" → add `main`.
  - Required reviewers → add the release maintainer; turn on "Prevent self-review" if a second maintainer is available.
  - Environment secrets:
    - `VSCE_PAT` = Azure DevOps PAT (above).
    - `OVSX_PAT` = Open VSX PAT (above), if Open VSX is wanted.
  - Delete any pre-existing repo-level `VSCE_PAT` / `OVSX_PAT` after the environment-scoped ones are in place — repo secrets bypass the environment's deployment-branch and reviewer gates.
