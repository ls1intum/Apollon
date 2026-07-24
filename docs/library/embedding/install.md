---
id: install
title: Install
description: Install @tumaet/apollon and its peer dependencies — React host vs non-React host.
---

# Install

:::info Requires React 19
Apollon renders on React 19 (`react` / `react-dom` `^19`). On React 18 the
install fails with an `ERESOLVE` peer error — upgrade your host to React 19 first.
:::

```sh
npm install @tumaet/apollon
```

npm 7+, pnpm 8+, and Bun install the five required peers automatically, so the
one-liner is all most setups need. Yarn never installs peers; the per-host
commands below list them explicitly (use them with Yarn, or whenever you want
to pin the peer versions yourself).

## React hosts

You already have `react` and `react-dom` — add the remaining peers:

```sh
npm install @tumaet/apollon @xyflow/react yjs y-protocols
```

```tsx
import { Apollon } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"
```

The `<Apollon>` component, hooks, and provider render on the React you already
have — see [React](/library/embedding/react).

## Non-React hosts (Angular, Vue, Svelte, vanilla)

Install all five peers. The API is imperative —
`new ApollonEditor(container, options)` — and the editor renders its own React
tree inside the container, so your own code never imports React:

```sh
npm install @tumaet/apollon \
  react react-dom \
  @xyflow/react \
  yjs y-protocols
```

```ts
import { ApollonEditor } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"
```

## Peer dependencies

| Peer            | Range     | Powers                                                |
| --------------- | --------- | ----------------------------------------------------- |
| `react`         | `^19.0.0` | the editor's rendering                                |
| `react-dom`     | `^19.0.0` | the editor's rendering                                |
| `@xyflow/react` | `^12.9.0` | the diagram canvas                                    |
| `yjs`           | `^13.6.0` | the document model, undo/redo, and live collaboration |
| `y-protocols`   | `^1.0.6`  | collaboration sync/awareness                          |

npm 7+, pnpm 8+, and Bun auto-install missing required peers; **Yarn never
does** — add them explicitly there.
Apollon externalizes every runtime dependency, so a host that already uses React
or Yjs shares a single instance with the editor instead of a private, possibly
mismatched copy — no duplicate payload, and no "Invalid hook call" or
cross-instance-document errors.

## Optional: PNG / PDF export

SVG and JSON export are built in. The PNG/PDF renderers (`@resvg/resvg-wasm`,
`jspdf`, `svg2pdf.js`) ship as **optional dependencies** of `@tumaet/apollon`,
so a normal install brings them in automatically; import them from
`@tumaet/apollon/export`. Add them explicitly only if you install with
`--omit=optional` (or an optional install was skipped):

```sh
npm install @resvg/resvg-wasm jspdf svg2pdf.js
```

See [Export](/library/api/export) for usage and the per-bundler wasm setup (PNG
needs the resvg wasm; PDF needs nothing extra).

## No bundler (CDN)

On the CDN path, esm.sh resolves and serves the peers from the import URL
automatically — there is nothing extra to load. See
[Vanilla JS / CDN](/library/embedding/vanilla).

## Type definitions

Types ship with the package (`dist/index.d.ts`). Requires TypeScript 5.0+ with `moduleResolution: "bundler" | "node16" | "nodenext"`.
