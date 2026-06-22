---
id: overview
title: Overview
description: Working in the Apollon monorepo — pnpm + Node 24 + Vite.
slug: /
---

# Contributor overview

Apollon is a **pnpm 11 monorepo on Node 24 LTS**. Every bundled artifact is built with Vite (the standalone server runs through `tsc` directly). The library is published to npm; the standalone ships as Docker images; the VS Code extension is published to the Marketplace and Open VSX. One repo, four release pipelines, one bundler.

## Setup

```sh
git clone git@github.com:ls1intum/Apollon.git
cd Apollon
nvm install && nvm use      # pins Node to .nvmrc (24 LTS)
pnpm install
pnpm dev
```

`pnpm dev` runs the library (build watch), server, webapp, and a local Redis container concurrently. Default ports auto-resolve; override via `APOLLON_WEBAPP_PORT`, `APOLLON_SERVER_PORT`, `APOLLON_WS_PORT`, `APOLLON_REDIS_PORT`.

## What's where

- **[Project structure](/contributor/development/project-structure)** — workspace layout
- **[Scripts](/contributor/development/scripts)** — the `pnpm` commands and what they do
- **[Diagram version history](/contributor/development/diagram-version-history)** — how named versions, autosaves, and eviction work in Apollon Standalone
- **[Visual tests](/contributor/development/visual-tests)** — Playwright snapshot regeneration inside the pinned Docker image
- **[Mobile builds](/contributor/development/mobile-builds)** — building the iOS / Android apps with Capacitor
- **[Troubleshooting](/contributor/troubleshooting)** — common local-setup and self-host issues
- **[Release notes](/contributor/development/release-notes)** — when to add a changeset and how to write it
- **[Release pipeline → GitHub Actions](/contributor/deployment/github-actions)** — required-status-checks setup
- **[Release pipeline → npm publishing](/contributor/deployment/npm-publishing)** — `release.yml` (Changesets Version Packages PR) + per-artifact release workflows

## Pull-request checklist

```sh
pnpm run lint        # eslint per workspace + markdownlint + docs typecheck
pnpm run format:check
pnpm run build       # library first, then server + webapp concurrently
pnpm test            # library unit tests
```

If the change is user-, embedder-, or operator-visible, also add a changeset — `pnpm changeset` — per the [release-notes guide](/contributor/development/release-notes).

The pre-push hook also runs `pnpm run lint`. CI runs the full matrix on every PR, Docker builds, and the library `publint` + bundle-size budgets, and the advisory **Verify changesets** check flags a tracked-package change that ships without one. Visual regression runs per-PR too (see [Visual tests](/contributor/development/visual-tests)) so a rendering change refreshes its own baselines; the document-growth budget is guarded per-PR on Firefox, the engine the exam-freeze was reported on.

## Commit messages

Conventional commits are enforced by `commitlint`, which constrains both the **type** (`type-enum`) and the **scope** (`scope-enum`):

```
chore(library): drop dead deps
fix(server): handle gunzip Z_DATA_ERROR in autoVersion
refactor(vscode-extension)!: drop deprecated webview-ui-toolkit
```

Valid types: `feat`, `fix`, `perf`, `docs`, `refactor`, `build`, `chore`, `ci`, `test`, `style`, `revert`. Valid scopes: `library`, `server`, `webapp`, `vscode`, `vscode-extension`, `deps`, `ci`, `docker`, `docs`, `release`. (`commitlint.config.mjs` is the source of truth.)

Because the repo is squash-merge only, the PR title's type becomes the commit type — and that type **groups the release note** (the full mapping is in [Release notes → How your change gets grouped](/contributor/development/release-notes#how-your-change-gets-grouped)). Pick it for the user-visible kind of change.
