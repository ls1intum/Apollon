---
id: scripts
title: Scripts
description: Every meaningful root pnpm script — build, dev, start, lint, test, docs, capacitor.
---

# Scripts

Run everything from the repo root. Root scripts fan out to the workspaces with
`pnpm --filter`, so you rarely need to `cd` into a package. Workspace layout is
in [Project structure](/contributor/development/project-structure).

```sh
pnpm install      # install all workspace dependencies
```

## Build

Builds run in dependency order — the library first, since every other artifact
consumes it.

| Script              | Does                                            |
| ------------------- | ----------------------------------------------- |
| `pnpm build`        | Library, then server and webapp concurrently    |
| `pnpm build:lib`    | Library only (`@tumaet/apollon`)                |
| `pnpm build:server` | Standalone server only                          |
| `pnpm build:webapp` | Standalone webapp only                          |
| `pnpm build:vscode` | VS Code extension plus its webviews             |
| `pnpm build:docs`   | Library, then the Docusaurus site (static HTML) |

## Dev

Hot-reload watchers for local development.

| Script            | Does                                                                |
| ----------------- | ------------------------------------------------------------------- |
| `pnpm dev`        | Library build watch + server + webapp + local Redis, all concurrent |
| `pnpm dev:lib`    | Library build watch only                                            |
| `pnpm dev:server` | Ensures local Redis, then runs the server under `tsx watch`         |
| `pnpm dev:webapp` | Webapp on Vite HMR                                                  |
| `pnpm dev:vscode` | VS Code extension build watch                                       |
| `pnpm dev:docs`   | Library build, then the Docusaurus dev server                       |

`pnpm dev` resolves port collisions for the webapp, server, WebSocket relay, and
Redis, and starts the Redis container only when no compatible local instance is
reachable. Override ports with `APOLLON_WEBAPP_PORT`, `APOLLON_SERVER_PORT`,
`APOLLON_WS_PORT`, or `APOLLON_REDIS_PORT`.

## Start

Run a production build locally — assumes `pnpm build` already ran.

| Script                   | Does                                                    |
| ------------------------ | ------------------------------------------------------- |
| `pnpm start`             | Built server and webapp concurrently                    |
| `pnpm start:server`      | Built server only                                       |
| `pnpm start:webapp`      | Built webapp only                                       |
| `pnpm start:webapp:host` | Webapp bound to `0.0.0.0` (LAN / device testing)        |
| `pnpm start:localdb`     | Local Redis container via `docker/compose.local.db.yml` |

## Lint and format

| Script              | Does                                                           |
| ------------------- | -------------------------------------------------------------- |
| `pnpm lint`         | ESLint across ui, library, server, webapp, vscode, and docs    |
| `pnpm lint:fix`     | ESLint with `--fix` across ui, library, server, webapp, vscode |
| `pnpm format`       | Prettier write across all supported file types                 |
| `pnpm format:check` | Prettier check only — no writes (used in CI)                   |

Per-workspace variants (`lint:ui`, `lint:lib`, `lint:server`, `lint:webapp`,
`lint:vscode`, `lint:docs`, and their `lint:fix:*` counterparts) exist for
narrower runs.
`lint:docs` runs `markdownlint-cli2` over the docs Markdown. Type-checking — the
Docusaurus config/theme (`typecheck`) and the doc code examples
(`check:doc-snippets`) — runs separately in CI, not as part of `lint`.

## Test

| Script          | Does                               |
| --------------- | ---------------------------------- |
| `pnpm test`     | Library Vitest unit suite          |
| `pnpm test:e2e` | Webapp Playwright end-to-end tests |

The webapp and server have their own Vitest suites that the root scripts do
not aggregate. Run them per-workspace:

```sh
pnpm --filter @tumaet/webapp run test   # webapp unit tests
pnpm --filter @tumaet/server run test   # server unit tests
```

Playwright visual regression lives in the webapp workspace — see
[Visual tests](/contributor/development/visual-tests).

## Docs

| Script                    | Does                                                   |
| ------------------------- | ------------------------------------------------------ |
| `pnpm dev:docs`           | Library build, then the Docusaurus dev server          |
| `pnpm build:docs`         | Library build, then the static Docusaurus site         |
| `pnpm check:doc-snippets` | Library build, then type-check the docs' code examples |

The docs site is published at <https://ls1intum.github.io/Apollon/>. The
Docusaurus build uses `onBrokenLinks: "throw"`, so a bad internal link fails
`build:docs`.

### Doc code examples are type-checked

`check:doc-snippets` (`scripts/check-doc-snippets.mjs`) compiles every fenced
`ts`/`tsx` block in `library/README.md`, `library/THEMING.md`, and
`docs/library/**` against the **real** built `@tumaet/apollon` types, so a public
API change that breaks a documented example fails CI (`pr-health-checks`) instead
of shipping rotten docs. Each block is checked as a standalone module, so it must
carry its own imports.

Mark a block `no-check` in the fence info string to skip it — for bare fragments
that reference an undeclared `editor`, type-signature illustrations, or
framework-specific examples (`@angular/core`, `next/dynamic`, the resvg `?url`
wasm import) that can't compile in isolation:

````md
```ts no-check
editor.fitView() // `editor` is illustrative, not declared here
```
````

The `no-check` token lives after the language in the info string, which
Docusaurus, GitHub, and npm all ignore when rendering — readers never see it.
Prefer making a block self-contained (add the imports) over `no-check` when it's
a real copy-paste example.

## Capacitor

Mobile shell scaffolding for the webapp. Run these once per platform; see
[Mobile builds](/contributor/development/mobile-builds) for the full flow.

| Script                                   | Does                               |
| ---------------------------------------- | ---------------------------------- |
| `pnpm capacitor:add:android`             | Add the Android platform           |
| `pnpm capacitor:add:ios`                 | Add the iOS platform               |
| `pnpm capacitor:sync`                    | Sync web assets into native shells |
| `pnpm capacitor:open:android`            | Open Android Studio                |
| `pnpm capacitor:open:ios`                | Open Xcode                         |
| `pnpm capacitor:assets:generate:android` | Generate Android icons / splash    |
| `pnpm capacitor:assets:generate:ios`     | Generate iOS icons / splash        |

## Release and packaging

Releases run on GitHub Actions — there are no local publish scripts. Cut a
release by merging the **Version Packages** PR that `release.yml` opens from the
accumulated changesets; the library, the standalone images and the VS Code
extension advance together. See
[npm publishing](/contributor/deployment/npm-publishing).
`pnpm package:vscode` builds a local `.vsix` for the VS Code extension.

| Script           | Does                                           |
| ---------------- | ---------------------------------------------- |
| `pnpm changeset` | Record a changelog entry for a user-visible PR |

Writing rules: [Release notes](/contributor/development/release-notes).

## Before opening a PR

The pull-request checklist (lint, format check, build, test) lives in the
[Contributor overview](/contributor/).
