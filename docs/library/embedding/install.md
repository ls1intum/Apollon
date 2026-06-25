---
id: install
title: Install
description: Install @tumaet/apollon — pick the standalone or /react subpath.
---

# Install

`yjs` and `y-protocols` are required peer dependencies of **both** builds — they
are the collaboration engine, kept external so a host that already uses Yjs
shares a single instance instead of loading a private, possibly mismatched copy.
Most package managers install missing peers automatically.

## Standalone build (any framework)

```sh
npm install @tumaet/apollon yjs y-protocols
```

```ts
import { ApollonEditor } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"
```

React, MUI, emotion, and xyflow are bundled inside the library tarball; only
`yjs` and `y-protocols` are peers you provide.

## Peer-dependency build (React hosts)

```sh
npm install @tumaet/apollon \
  yjs y-protocols \
  react react-dom \
  @emotion/react @emotion/styled @mui/material @xyflow/react
```

```ts
import { ApollonEditor } from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"
```

`yjs` and `y-protocols` are required for both builds; the remaining peers below
are specific to the `/react` build.

| Peer              | Range      |
| ----------------- | ---------- |
| `yjs`             | `^13.6.0`  |
| `y-protocols`     | `^1.0.6`   |
| `react`           | `^19.0.0`  |
| `react-dom`       | `^19.0.0`  |
| `@mui/material`   | `^6.4.0`   |
| `@emotion/react`  | `^11.12.0` |
| `@emotion/styled` | `^11.12.0` |
| `@xyflow/react`   | `^12.9.0`  |

The `/react` subpath keeps your final bundle from shipping a second copy of
React. It is also the entry that exports the `<Apollon>` React component — the
recommended way to embed in React. See [React](/library/embedding/react).

## Fully external build (any bundler host)

```sh
npm install @tumaet/apollon \
  yjs y-protocols \
  react react-dom \
  @emotion/react @emotion/styled @mui/material @xyflow/react
```

```ts
import { ApollonEditor } from "@tumaet/apollon/external"
import "@tumaet/apollon/style.css"
```

Same imperative `ApollonEditor` API as the default entry, but **every**
dependency is external — the React family above _and_ Apollon's own runtime
deps (`@dnd-kit`, `zustand`, `uuid`, `@chenglou/pretext`), which arrive
transitively with the package. Your bundler resolves and de-duplicates each one
against your app's `node_modules`, and your bundle analyzer / SBOM tooling sees
them as real packages instead of code inlined invisibly into one chunk. Use it
from any framework with a bundler, including non-React ones (the editor still
runs on the React you provide internally; your own code never touches it).

## Type definitions

Types ship with the package (`dist/index.d.ts`) and are identical for every subpath. Requires TypeScript 5.0+ with `moduleResolution: "bundler" | "node16" | "nodenext"`.
