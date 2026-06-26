# @tumaet/webapp

The browser-hosted web app for [Apollon](../../README.md). Wraps the [`@tumaet/apollon`](../../library) library with routing, diagram persistence, sharing, and assessment UI.

Part of the Apollon monorepo — run it from the repo root with `pnpm dev`, not from here.

## Stack

React 19, TypeScript, Vite, the shadcn-style [`@tumaet/ui`](../../packages/ui) design system (Base UI primitives + Tailwind v4), Storybook, Vitest, Playwright (visual + e2e).

## Scripts

Common commands (run from the repo root so workspace resolution picks up the library build):

```sh
pnpm dev                    # Full stack: library watch + server + webapp
pnpm dev:webapp             # Webapp only (expects library dist/ and server already running)
pnpm storybook              # Storybook (editor + @tumaet/ui stories) on :6006
pnpm test:e2e               # Playwright e2e suite
pnpm build:webapp           # Production bundle into dist/
```

See the root [README](../../README.md) and the [docs](../../docs) for end-to-end setup, environment variables, and deployment.
