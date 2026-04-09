# Scripts Overview

Here are the commonly used scripts defined in the monorepo:

## Installation and Dependencies

- **Install dependencies:**
  ```bash
  npm install
  ```

## Building

- **Build all packages:**
  ```bash
  npm run build
  ```

## Development

- **Start dev stack with hot reload** (recommended for development):
  ```bash
  npm run dev
  ```
  Starts the library (build watch), server, and webapp concurrently. The command also resolves local port collisions for the webapp, server, WebSocket relay, and Redis, and it starts the local Redis container only when no compatible local Redis instance is already reachable.
  You can prefer custom ports by setting `APOLLON_WEBAPP_PORT`, `APOLLON_SERVER_PORT`, `APOLLON_WS_PORT`, or `APOLLON_REDIS_PORT` before starting the stack.

- **Start production build:**
  ```bash
  npm run start
  ```

## Code Quality

- **Check linting of the project:**

  ```bash
  npm run lint
  ```

- **Fixes formatting issues:**

  ```bash
  npm run format
  ```

- **Checks formatting issues without fixing them:**
  ```bash
  npm run format:check
  ```

## Database

- **Start local Redis:**
  ```bash
  npm run start:localdb
  ```
  Starts Redis in Docker via `docker/compose.local.db.yml`.

## Library Publishing

- **Publish patch version:**

  ```bash
  npm run publish:library:patch
  ```

- **Publish minor version:**
  ```bash
  npm run publish:library:minor
  ```
