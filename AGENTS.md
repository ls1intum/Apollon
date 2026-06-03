# Apollon agent conventions

Conventions for AI coding agents in [Apollon](https://github.com/ls1intum/Apollon), the TUM UML diagram editor. Follows the [agents.md](https://agents.md) convention; `CLAUDE.md` is a symlink to this file.

## Architecture

A pnpm monorepo on Node 24 LTS, bundled with Vite. Four release pipelines:

- **`library/`** — `@tumaet/apollon`, the embeddable React editor on [npm](https://www.npmjs.com/package/@tumaet/apollon). React 18, Vite 6, Yjs for live collaboration, MUI 6 + `@emotion/react`. Published for Node `>=22`.
- **`standalone/webapp/`** — `@tumaet/webapp` (private), the SPA at `apollon.aet.cit.tum.de`. React 18 + Vite 6 + Tailwind; Capacitor for iOS/Android.
- **`standalone/server/`** — `@tumaet/server` (private), Express API on Redis Stack 7.4 (RedisJSON for diagram storage + version history).
- **`vscode-extension/`** — `apollon-vscode`, the VS Code extension (Marketplace + Open VSX), with nested `menu/` and `editor/` webview sub-packages.
- **`docs/`** — `@tumaet/apollon-docs` (private), the Docusaurus site at <https://ls1intum.github.io/Apollon>, split into `user/`, `library/`, and `contributor/`.
- **`ops/`** — operations runbook, legal pages, and the TUM DSMS package. Not part of any release.
- **`docker/`** — compose files for local Redis (`compose.local.db.yml`) and prod (`compose.{app,db,proxy}.yml`).

`@tumaet/apollon` is consumed via `workspace:*` by every other package. `standalone/webapp` and `standalone/server` are paired in `.changeset/config.json#fixed` and release together.

## Toolchain

- **Node** `>=24.15.0` (`.nvmrc` pins; `nvm use`). The library workspace targets `>=22` for its published consumers.
- **pnpm** `>=11.1.0`, pinned in `package.json#packageManager`. Workspaces and shared version pins (`catalog:`) live in `pnpm-workspace.yaml`; one root `pnpm-lock.yaml`.
- **Docker** for the local Redis Stack (`pnpm start:localdb`).

## Routine commands

| Concern              | Command                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| Install              | `pnpm install`                                                           |
| Full dev stack       | `pnpm dev` _(library watch + server + webapp; spins up Redis)_           |
| Single workspace     | `pnpm dev:lib` · `dev:server` · `dev:webapp` · `dev:vscode` · `dev:docs` |
| Build everything     | `pnpm build` _(library, then server + webapp)_ · `pnpm build:docs`       |
| Lint                 | `pnpm lint` (`pnpm lint:fix` to apply fixes)                             |
| Format               | `pnpm format` _(write)_ · `pnpm format:check` _(read-only, CI)_          |
| Unit tests (library) | `pnpm test`                                                              |
| E2E tests (webapp)   | `pnpm test:e2e` _(Playwright against a built webapp)_                    |
| Add a changeset      | `pnpm changeset`                                                         |

Before opening a PR: `pnpm format:check && pnpm lint && pnpm test && pnpm build` must pass.

## Code conventions

- **TypeScript everywhere.** ESLint is authoritative (`eslint.config.mjs` per workspace); Prettier is authoritative for formatting (root `.prettierrc` — no semicolons, double quotes).
- **React 18**, functional components + hooks. MUI 6 + `@emotion/react` in the library; Tailwind inside `standalone/webapp/`.
- **Shared dependency versions** go through the pnpm `catalog:` in `pnpm-workspace.yaml` — reference `"catalog:"` instead of duplicating a version string.
- **Yjs** powers collaboration; the live-cursor and presence layer lives in the library (see [`docs/library/api/collaboration.md`](docs/library/api/collaboration.md)).
- **Test layout.** Library unit tests in `library/tests/unit/`; webapp unit, visual-regression, and e2e suites under `standalone/webapp/tests/`. `pnpm test` runs the library suite.
- **Conventional Commits** with a constrained scope set; `commitlint.config.mjs` is the source of truth.

## PRs and releases

- **Squash-merge only.** PR title becomes the merge commit subject; PR body becomes its body.
- **PR title** is a Conventional Commit subject — enforced locally by `.husky/commit-msg` and in CI by [`.github/workflows/pr-title.yml`](.github/workflows/pr-title.yml).
- **Changesets** carry user-facing release notes. Run `pnpm changeset` on any PR that changes a published or operator-visible package; skip on docs-only / CI-only / refactor PRs. Writing rules in [`docs/contributor/development/release-notes.md`](docs/contributor/development/release-notes.md). The publish pipeline still runs through `version-bump.yml`; changesets accumulate for the changelog automation that will replace it.

## Gotchas

- The library is consumed by the standalone app, the VS Code extension, and external embedders — don't couple its APIs to standalone-only assumptions; gate behind options if you must.
- The server requires `OWNER_SECRET` ≥ 32 chars (`openssl rand -hex 32`) in production. Local dev accepts a placeholder.
- `dist/` directories are build outputs — never commit them.
- `CLAUDE.md` is a checked-in symlink to this file (git mode `120000`). On Windows, enable symlinks (`git config --global core.symlinks true`) or it checks out as a plain text file.

## Do not

- Edit `library/dist/` or the `.changeset/*.md` files consumed by `changeset version`.
- Add co-authored-by / agent-attribution trailers inside a changeset body — it lands in `CHANGELOG.md` verbatim.

## Deeper docs

- Contributing flow: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Release-note style guide: [`docs/contributor/development/release-notes.md`](docs/contributor/development/release-notes.md)
- Project structure: [`docs/contributor/development/project-structure.md`](docs/contributor/development/project-structure.md)
- Deployment + ops: [`docs/contributor/deployment/github-actions.md`](docs/contributor/deployment/github-actions.md), [`ops/operations.md`](ops/operations.md)
- Mobile: [`docs/contributor/development/mobile-builds.md`](docs/contributor/development/mobile-builds.md)
