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
- **[Scripts](/contributor/development/scripts)** — every `pnpm` command and what it does
- **[Versioning](/contributor/development/versioning)** — library / standalone / VS Code release semantics
- **[Visual tests](/contributor/development/visual-tests)** — Playwright snapshot regeneration inside the pinned Docker image
- **[Release pipeline → GitHub Actions](/contributor/deployment/github-actions)** — required-status-checks setup
- **[Release pipeline → npm publishing](/contributor/deployment/npm-publishing)** — `version-bump.yml` + per-artifact release workflows

## Pull-request checklist

```sh
pnpm run lint        # eslint across all workspaces
pnpm run format:check
pnpm run build       # library → server → webapp → vscode (in order)
pnpm test            # 774 library unit tests
```

The pre-push hook also runs `pnpm run lint`. CI runs the full matrix plus visual regression, Docker builds, and the library `publint` + `arethetypeswrong` + bundle-size budgets.

## Commit messages

Conventional commits are enforced by `commitlint`. The `scope-enum` rule constrains scopes:

```
chore(library): drop dead deps
fix(server): handle gunzip Z_DATA_ERROR in autoVersion
refactor(vscode-extension)!: drop deprecated webview-ui-toolkit
```

Valid scopes: `library`, `server`, `webapp`, `vscode`, `vscode-extension`, `deps`, `ci`, `docker`, `docs`, `release`.
