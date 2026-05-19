# Apollon — agent contract

Repo-specific rules an agent needs to be productive here. Complements [`docs/contributing.md`](docs/contributing.md) and [`docs/development/release-notes.md`](docs/development/release-notes.md); does not replace them.

## Repository shape

npm workspace monorepo with three release lines:

- **`library/`** — `@tumaet/apollon`, published to npm.
- **`standalone/webapp/`** + **`standalone/server/`** — `@tumaet/webapp` and `@tumaet/server` (both private; Docker images on `ghcr.io/ls1intum/apollon`). Released in lockstep via `fixed` in [`.changeset/config.json`](.changeset/config.json).
- **`vscode-extension/`** — `apollon-vscode`, published to VS Marketplace and Open VSX.

A library minor auto-patches webapp + server through `updateInternalDependencies: patch` — see [`docs/development/release-notes.md`](docs/development/release-notes.md#per-package-conventions) for the full release-line conventions.

## Commits and PRs

- Squash-merge only — your PR title becomes the merge commit subject, your PR body becomes its body.
- PR title must be a Conventional Commit subject (`feat:`, `fix(scope):`, …). Enforced by `commitlint` via `.husky/commit-msg` locally and [`.github/workflows/pr-title.yml`](.github/workflows/pr-title.yml) in CI.
- Every PR that changes a published or operator-visible workspace needs a Changesets entry (`npm run changeset`). Docs-only / CI-only / refactor PRs don't. CI runs [`verify-changesets`](.github/workflows/verify-changesets.yml) and surfaces missing entries in the check summary.

## What goes where

A PR has three texts you write, each for a different reader:

| Surface                     | Audience                        | Output                          |
| --------------------------- | ------------------------------- | ------------------------------- |
| Commit subject (= PR title) | reviewer scanning `git log`     | Conventional Commit             |
| PR body                     | reviewer                        | how, why, trade-offs, test plan |
| `.changeset/*.md` body      | end user reading `CHANGELOG.md` | one sentence, user voice        |

The changeset body lands in `CHANGELOG.md` verbatim. Don't co-author trailers into it. The full writing rules — including the breaking-change runbook convention — are in [`docs/development/release-notes.md`](docs/development/release-notes.md); read it before your first user-facing PR.

## Where to look first

- Architecture: [`docs/development/project-structure.md`](docs/development/project-structure.md)
- Local dev: [`docs/getting-started/setup.md`](docs/getting-started/setup.md)
- Deployment: [`docs/deployment/github-actions.md`](docs/deployment/github-actions.md), [`docs/admin/operations.md`](docs/admin/operations.md)
- Mobile (iOS / Android): [`docs/mobile/ios-android-setup.md`](docs/mobile/ios-android-setup.md)
