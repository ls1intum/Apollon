# Apollon Agent Handbook

Repo for [Apollon](https://github.com/ls1intum/Apollon) — the TUM UML diagram editor. TypeScript monorepo with three published artefacts. This file is the entry point for any agent (Claude Code, Cursor, Copilot, Codex, …) working in the repo. `CLAUDE.md` is a symlink to this file so both stay in sync.

## Architecture

- **`library/`** — `@tumaet/apollon`, the embeddable React component on [npm](https://www.npmjs.com/package/@tumaet/apollon). React 18, Vite 6, Yjs for live collaboration.
- **`standalone/webapp/`** — `@tumaet/webapp` (private), the SPA at `apollon.aet.cit.tum.de`. React 18 + Vite 6 + Capacitor for iOS/Android.
- **`standalone/server/`** — `@tumaet/server` (private), Express API on Redis Stack 7.4 (RedisJSON for diagram storage + version history).
- **`vscode-extension/`** — `apollon-vscode`, the VS Code extension. Marketplace today; Open VSX is wired but skips when `OVSX_PAT` is unset.
- **`docker/`** — compose files for local Redis (`compose.local.db.yml`) and prod (`compose.{app,db,proxy}.yml`).
- **`docs/`** — `getting-started/`, `development/`, `deployment/`, `admin/`, `mobile/`. Deep tour in [`docs/development/project-structure.md`](docs/development/project-structure.md).

`standalone/webapp` + `standalone/server` are **released in lockstep** via `fixed` in [`.changeset/config.json`](.changeset/config.json). A library minor auto-patches them through `updateInternalDependencies: patch`.

## Toolchain

- **Node.js**: `>=22.14.0` (`.nvmrc` pins the version; `nvm use`).
- **npm**: `>=11.1.0`. Workspaces; one root `package-lock.json` plus separate lockfiles under `vscode-extension/{menu,editor}`.
- **Docker**: needed for the local Redis Stack (`npm run start:localdb`).
- **Mobile**: Xcode (iOS) / Android Studio (Android); full setup in [`docs/mobile/ios-android-setup.md`](docs/mobile/ios-android-setup.md).

## Routine commands

| Concern                | Command                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| Install                | `npm install`                                                         |
| Full dev stack         | `npm run dev` _(library watch + server + webapp; spins up Redis)_     |
| Single workspace       | `npm run dev:lib` · `dev:server` · `dev:webapp` · `dev:vscode`        |
| Build everything       | `npm run build`                                                       |
| Lint                   | `npm run lint` (`npm run lint:fix` to apply fixes)                    |
| Format                 | `npm run format` _(write)_ · `npm run format:check` _(read-only, CI)_ |
| Unit tests             | `npm test` _(Vitest in the library)_                                  |
| E2E tests              | `npm run test:e2e` _(Playwright against a built webapp)_              |
| Add a changeset        | `npm run changeset`                                                   |
| Release-doc invariants | `npm run check:release-docs` + `npm run test:release-docs`            |

Before opening a PR: `npm run format:check && npm run lint && npm test` must pass.

## Code conventions

- **TypeScript everywhere.** ESLint is authoritative (`eslint.config.*` per workspace); Prettier is authoritative for formatting (root `.prettierignore`).
- **React 18**, functional components + hooks. `@emotion/react` + MUI 6 in the library; Tailwind inside `standalone/webapp/`.
- **Yjs** powers collaboration. The library exposes presence/awareness through `editor.subscribeToAwarenessChanges` and the `setLocalAwareness*` family (see `library/lib/apollon-editor.tsx`); embedders render their own cursor UI on top.
- **Tests live next to source.** Library unit tests in `library/tests/unit/`; webapp unit tests in `standalone/webapp/tests/unit/`; visual-regression in `standalone/webapp/tests/visual/`; e2e in `standalone/webapp/tests/e2e/`.
- **Conventional Commits** for commit subjects and PR titles. `commitlint.config.mjs` is the source of truth.

## PRs and releases

- **Squash-merge only.** PR title becomes the merge commit subject; PR body becomes its body.
- **PR title** is a Conventional Commit subject. Enforced locally by `.husky/commit-msg` and in CI by [`.github/workflows/pr-title.yml`](.github/workflows/pr-title.yml).
- **Changesets** drive release-note generation. Run `npm run changeset` on any PR that changes a published or operator-visible workspace; the file you produce is the changelog entry, **verbatim**. Full rules: [`docs/development/release-notes.md`](docs/development/release-notes.md). Docs-only / CI-only / refactor PRs don't need a changeset.

## Gotchas

- The library is consumed by both the standalone webapp and external embedders. Don't couple library APIs to standalone-only runtime assumptions; gate behind options if you must.
- The server refuses to boot in production without `OWNER_SECRET` ≥ 32 chars (`openssl rand -hex 32`); local dev accepts a placeholder.
- `library/dist/` and `standalone/webapp/dist/` are build outputs — don't commit them.
- Workspace deps: `@tumaet/apollon` is consumed by `standalone/{webapp,server}` and `vscode-extension/` as a workspace link (`"*"`), not a published-version pin.

## Do not

- Edit `library/dist/`, generated lockfiles outside the package they belong to, or `.changeset/*.md` files written by `changeset version` (Changesets owns them).
- Add a co-authored-by / agent-attribution trailer inside a changeset body. The changeset body lands in `CHANGELOG.md` verbatim and feeds the user-facing release notes.
- Skip `npm run lint` or `npm run format:check` to "fix later" — CI blocks on both.

## Deeper docs

- Architecture: [`docs/development/project-structure.md`](docs/development/project-structure.md)
- Local setup: [`docs/getting-started/setup.md`](docs/getting-started/setup.md)
- Deployment + ops: [`docs/deployment/github-actions.md`](docs/deployment/github-actions.md), [`docs/admin/operations.md`](docs/admin/operations.md)
- Mobile: [`docs/mobile/ios-android-setup.md`](docs/mobile/ios-android-setup.md)
- Contributing flow: [`docs/contributing.md`](docs/contributing.md)
- Release-note style guide: [`docs/development/release-notes.md`](docs/development/release-notes.md)
