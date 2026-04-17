# @tumaet/webapp

The browser-hosted web app for [Apollon](../../README.md). Wraps the [`@tumaet/apollon`](../../library) library with routing, diagram persistence, sharing, and assessment UI.

Part of the Apollon monorepo — run it from the repo root with `npm run dev`, not from here.

## Stack

React, TypeScript, Vite, MUI, Tailwind, Playwright (visual + e2e).

## Scripts

Common commands (run from the repo root so workspace resolution picks up the library build):

```sh
npm run dev                 # Full stack: library watch + server + webapp
npm run dev:webapp          # Webapp only (expects library dist/ and server already running)
npm run test:e2e            # Playwright e2e suite
npm run build:webapp        # Production bundle into dist/
```

See the root [README](../../README.md) and the [docs](../../docs) for end-to-end setup, environment variables, and deployment.
