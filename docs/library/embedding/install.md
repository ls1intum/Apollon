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
| `react`           | `^18.3.0`  |
| `react-dom`       | `^18.3.0`  |
| `@mui/material`   | `^6.4.0`   |
| `@emotion/react`  | `^11.11.0` |
| `@emotion/styled` | `^11.11.0` |
| `@xyflow/react`   | `^12.3.0`  |

The `/react` subpath keeps your final bundle from shipping a second copy of
React. It is also the entry that exports the `<Apollon>` React component — the
recommended way to embed in React. See [React](/library/embedding/react).

## Type definitions

Types ship with the package (`dist/index.d.ts`) and are identical for both subpaths. Requires TypeScript 5.0+ with `moduleResolution: "bundler" | "node16" | "nodenext"`.
