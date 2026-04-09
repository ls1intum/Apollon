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
  Starts the library (build watch), server (tsx watch on http://localhost:8000), and webapp (Vite HMR on http://localhost:5173) concurrently. The command also starts the local Redis container and waits until it is reachable before booting the server.

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
