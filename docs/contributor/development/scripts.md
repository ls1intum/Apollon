---
id: scripts
title: Scripts
description: pnpm scripts every contributor uses — install, dev, build, lint.
---

# Scripts

Commonly used scripts defined in the monorepo:

## Installation and Dependencies

- **Install dependencies:**
  ```bash
  pnpm install
  ```

## Building

- **Build all packages:**
  ```bash
  pnpm build
  ```

## Development

- **Start dev stack with hot reload** (recommended for development):
  ```bash
  pnpm dev
  ```
  Starts the library (build watch), server, and webapp concurrently. The command also resolves local port collisions for the webapp, server, WebSocket relay, and Redis, and it starts the local Redis container only when no compatible local Redis instance is already reachable.
  You can prefer custom ports by setting `APOLLON_WEBAPP_PORT`, `APOLLON_SERVER_PORT`, `APOLLON_WS_PORT`, or `APOLLON_REDIS_PORT` before starting the stack.

- **Start production build:**
  ```bash
  pnpm start
  ```

## Code Quality

- **Check linting of the project:**

  ```bash
  pnpm lint
  ```

- **Fixes formatting issues:**

  ```bash
  pnpm format
  ```

- **Checks formatting issues without fixing them:**
  ```bash
  pnpm format:check
  ```

## Database

- **Start local Redis:**
  ```bash
  pnpm start:localdb
  ```
  Starts Redis in Docker via `docker/compose.local.db.yml`.

## Releases

Releases run entirely on GitHub Actions — there are no local publish scripts. Cut a release by dispatching the **Version Bump** workflow and merging the PR it opens. See [Releases](../deployment/npm-publishing) for the end-to-end flow.
