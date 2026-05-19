# Apollon Agent Handbook

Entry point for AI coding agents working in [Apollon](https://github.com/ls1intum/Apollon), the TUM UML diagram editor. `CLAUDE.md` is a symlink to this file.

## Architecture

- **`library/`** — `@tumaet/apollon`, the embeddable React component on [npm](https://www.npmjs.com/package/@tumaet/apollon). React 18, Vite 6, Yjs for live collaboration, MUI 6 + `@emotion/react` for UI primitives.
- **`standalone/webapp/`** — `@tumaet/webapp` (private), the SPA at `apollon.aet.cit.tum.de`. React 18 + Vite 6 + Tailwind; Capacitor for iOS/Android.
- **`standalone/server/`** — `@tumaet/server` (private), Express API on Redis Stack 7.4 (RedisJSON for diagram storage + version history).
- **`vscode-extension/`** — `apollon-vscode`, the VS Code extension. Marketplace today; Open VSX wired but skips when `OVSX_PAT` is unset.
- **`docker/`** — compose files for local Redis (`compose.local.db.yml`) and prod (`compose.{app,db,proxy}.yml`).
- **`docs/`** — `getting-started/`, `development/`, `deployment/`, `admin/`, `mobile/`. Deep tour in [`docs/development/project-structure.md`](docs/development/project-structure.md).

`standalone/webapp` + `standalone/server` are released in lockstep via `fixed` in [`.changeset/config.json`](.changeset/config.json). A library minor auto-patches them through `updateInternalDependencies: patch`.

## Toolchain

- **Node.js** `>=22.14.0` (`.nvmrc` pins; `nvm use`).
- **npm** `>=11.1.0`. Workspaces; one root `package-lock.json` plus separate lockfiles under `vscode-extension/{menu,editor}`.
- **Docker** for the local Redis Stack (`npm run start:localdb`).

## Routine commands

| Concern              | Command                                                               |
| -------------------- | --------------------------------------------------------------------- |
| Install              | `npm install`                                                         |
| Full dev stack       | `npm run dev` _(library watch + server + webapp; spins up Redis)_     |
| Single workspace     | `npm run dev:lib` · `dev:server` · `dev:webapp` · `dev:vscode`        |
| Build everything     | `npm run build`                                                       |
| Lint                 | `npm run lint` (`npm run lint:fix` to apply fixes)                    |
| Format               | `npm run format` _(write)_ · `npm run format:check` _(read-only, CI)_ |
| Unit tests (library) | `npm test`                                                            |
| E2E tests (webapp)   | `npm run test:e2e` _(Playwright against a built webapp)_              |
| Add a changeset      | `npm run changeset`                                                   |

Before opening a PR: `npm run format:check && npm run lint && npm test` must pass.

## Code conventions

- **TypeScript everywhere.** ESLint is authoritative (`eslint.config.*` per workspace); Prettier is authoritative for formatting (root `.prettierignore`).
- **React 18**, functional components + hooks. MUI 6 + `@emotion/react` in the library; Tailwind inside `standalone/webapp/`.
- **Yjs** powers collaboration. The library exposes awareness via `editor.subscribeToAwarenessChanges` and `setLocalAwareness*` (see `library/lib/apollon-editor.tsx`); embedders own the cursor UI.
- **Test layout.** Library unit tests in `library/tests/unit/`; webapp unit tests in `standalone/webapp/tests/unit/`; visual-regression in `standalone/webapp/tests/visual/`; e2e in `standalone/webapp/tests/e2e/`. `npm test` runs the library suite; webapp tests run via `--workspace=@tumaet/webapp`.
- **Conventional Commits** for commit subjects and PR titles. `commitlint.config.mjs` is the source of truth.

## PRs and releases

- **Squash-merge only.** PR title becomes the merge commit subject; PR body becomes its body.
- **PR title** is a Conventional Commit subject. Enforced locally by `.husky/commit-msg` and in CI by [`.github/workflows/pr-title.yml`](.github/workflows/pr-title.yml).
- **Changesets** are being adopted. Run `npm run changeset` on any PR that changes a published or operator-visible workspace; the file you produce is the changelog entry, **verbatim**. Skip on docs-only / CI-only / refactor PRs. The pipeline cutover to `changesets/action` is in a follow-up PR; until then changesets accumulate and the existing `Version bump` workflow drives releases. Full rules: [`docs/development/release-notes.md`](docs/development/release-notes.md).

## Gotchas

- The library is consumed by both the standalone webapp and external embedders. Don't couple library APIs to standalone-only runtime assumptions; gate behind options if you must.
- The server requires `OWNER_SECRET` ≥ 32 chars (`openssl rand -hex 32`) in production. Local dev accepts a placeholder.
- `library/dist/` and `standalone/webapp/dist/` are build outputs — don't commit them.
- Workspace deps: `@tumaet/apollon` is consumed by `standalone/{webapp,server}` and `vscode-extension/` as a workspace link (`"*"`), not a published-version pin.

## Do not

- Edit `library/dist/` or `.changeset/*.md` files written by `changeset version` (Changesets owns them).
- Add co-authored-by / agent-attribution trailers inside a changeset body. The changeset body lands in `CHANGELOG.md` verbatim and feeds the user-facing release notes.

## Deeper docs

- Contributing flow: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Release-note style guide: [`docs/development/release-notes.md`](docs/development/release-notes.md)
- Deployment + ops: [`docs/deployment/github-actions.md`](docs/deployment/github-actions.md), [`docs/admin/operations.md`](docs/admin/operations.md)
- Mobile: [`docs/mobile/ios-android-setup.md`](docs/mobile/ios-android-setup.md)
