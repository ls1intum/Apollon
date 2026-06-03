# Apollon agent conventions

Conventions for AI coding agents in this repo, the TUM UML diagram editor. Follows the [agents.md](https://agents.md) convention; `CLAUDE.md` is a symlink to this file. Versions and engines live in the manifests — read them, don't trust a number written here.

## Commands

- `pnpm install` to bootstrap; `pnpm dev` runs the full stack (library watch + server + webapp, and spins up Redis in Docker).
- After editing, run the relevant check and iterate until green. Before a PR this gate must pass: `pnpm lint && pnpm format:check && pnpm build && pnpm test`.
- `pnpm test` runs the **library** suite only; `pnpm test:e2e` runs Playwright against a _built_ webapp.
- `pnpm changeset` records a release note (see PRs and releases). Full script reference: [`scripts.md`](docs/contributor/development/scripts.md).

## Layout

A pnpm + Vite monorepo (the server compiles with `tsc`, not Vite).

- **`library/`** — `@tumaet/apollon`, the embeddable React editor, published to npm. MUI + `@emotion/react`; Yjs collaboration — the live-cursor/presence layer lives here ([`collaboration.md`](docs/library/api/collaboration.md)).
- **`standalone/webapp/`** — `@tumaet/webapp` (private). React + Vite + Tailwind; Capacitor for iOS/Android.
- **`standalone/server/`** — `@tumaet/server` (private). Express + Redis Stack (RedisJSON diagram storage + version history).
- **`vscode-extension/`** — `apollon-vscode`, with nested `menu/` and `editor/` webview sub-packages.
- **`docs/`** — `@tumaet/apollon-docs` (private), the Docusaurus site (`user/` · `library/` · `contributor/`).
- **`ops/`** — runbooks and legal/DSMS material; not part of any release.

`@tumaet/apollon` is consumed via `workspace:*` by every other workspace, so a library change can ripple everywhere. `standalone/webapp` + `standalone/server` are paired in `.changeset/config.json#fixed` and release together. The `library/` workspace targets an older Node floor than the repo (it ships to external consumers) — check `library/package.json` before using newer Node APIs.

## Conventions

- **Prettier is authoritative:** no semicolons, double quotes (`.prettierrc`). **ESLint** flat config lives in `library/`, `standalone/{webapp,server}/`, and `vscode-extension/`.
- **Styling boundary:** MUI + `@emotion/react` in `library/`; Tailwind only in `standalone/webapp/`. Don't cross them.
- **Shared dependency versions** go through the pnpm `catalog:` in `pnpm-workspace.yaml` — write `"catalog:"`, never duplicate a version string.
- **Tests** live in `library/tests/unit/` and `standalone/webapp/tests/` (unit, visual, e2e).
- **Conventional Commits** with a constrained scope set — `commitlint.config.mjs` is the source of truth.

## PRs and releases

- **Squash-merge only** — the PR title becomes the merge commit subject and must be a valid Conventional Commit (enforced in CI by [`pr-title.yml`](.github/workflows/pr-title.yml)).
- **Changesets** carry release notes. Run `pnpm changeset` when you change `@tumaet/apollon`, `@tumaet/webapp`, or `@tumaet/server`. Skip docs-/CI-/refactor-only PRs and the VS Code extension (separate release; excluded in `.changeset/config.json`). Writing rules: [`release-notes.md`](docs/contributor/development/release-notes.md).

## Gotchas / do not

- The library is consumed by the standalone app, the VS Code extension, and external embedders — don't couple its APIs to standalone-only assumptions; gate behind options.
- The server requires `OWNER_SECRET` ≥ 32 chars in production (`openssl rand -hex 32`); local dev accepts a placeholder.
- Never commit build output (`library/dist/`, `standalone/webapp/dist/`, …).
- Don't hand-edit the `.changeset/*.md` entries the changelog automation will consume — create them with `pnpm changeset`.
- Don't put co-authored-by / agent-attribution trailers in a changeset body — it lands in `CHANGELOG.md` verbatim.
- `CLAUDE.md` is a checked-in symlink to this file (git mode `120000`); on Windows, enable symlinks (`git config --global core.symlinks true`) or it checks out as plain text.

## Deeper docs

- Contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Project structure: [`docs/contributor/development/project-structure.md`](docs/contributor/development/project-structure.md)
- Deployment + ops: [`docs/contributor/deployment/github-actions.md`](docs/contributor/deployment/github-actions.md), [`ops/operations.md`](ops/operations.md)
- Mobile: [`docs/contributor/development/mobile-builds.md`](docs/contributor/development/mobile-builds.md)
