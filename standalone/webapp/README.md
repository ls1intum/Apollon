# @tumaet/webapp

The browser-hosted web app for [Apollon](../../README.md). Wraps the [`@tumaet/apollon`](../../library) library with routing, diagram persistence, sharing, and assessment UI.

Part of the Apollon monorepo — run it from the repo root with `pnpm dev`, not from here.

## Stack

React 19, TypeScript, Vite, the shadcn-style [`@tumaet/ui`](../../packages/ui) design system (Base UI primitives + Tailwind v4), [TanStack Query](https://tanstack.com/query) for version-history server state, Storybook, Vitest, Playwright (visual + e2e).

## Debugging server state

Version history — the list, the immutable snapshot bodies, and the
create/rename/delete/restore mutations — goes through TanStack Query (see
[`src/queries`](src/queries) and the boundary note in
[`src/queryClient.ts`](src/queryClient.ts)). The editor's initial diagram
body is deliberately NOT a query: it is a one-shot seed that Yjs owns after
mount, so it must never be refetched or served from a cache — see
[`src/hooks/useDiagramSeed.ts`](src/hooks/useDiagramSeed.ts).

The Query Devtools are **off by default**: their floating button sits
bottom-right, on top of the editor's minimap, and every other corner is taken
by the editor's own chrome. Enable them per browser from the console, then
reload:

```js
localStorage.setItem("apollon:query-devtools", "1")
```

They are stripped from production builds regardless.

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
