---
id: install
title: Install
description: Install @tumaet/apollon — pick the standalone or /react subpath.
---

# Install

`yjs` and `y-protocols` are required peer dependencies of **every** build — they
power Apollon's document model and undo/redo (and live collaboration when
enabled), so the editor needs them whether or not you collaborate. Keeping them
external lets a host that already uses Yjs share a single instance instead of a
private, possibly mismatched copy. Most package managers install missing peers
automatically.

## Standalone build (any framework)

```sh
npm install @tumaet/apollon yjs y-protocols
```

```ts
import { ApollonEditor } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"
```

React, Base UI, lucide, and xyflow are bundled inside the library tarball; only
`yjs` and `y-protocols` are peers you provide.

## Peer-dependency build (React hosts)

```sh
npm install @tumaet/apollon \
  yjs y-protocols \
  react react-dom \
  @xyflow/react
```

```ts
import { ApollonEditor } from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"
```

`yjs` and `y-protocols` are required for every build; the React and xyflow peers
below are needed by the `/react` and `/external` builds.

| Peer            | Range     |
| --------------- | --------- |
| `yjs`           | `^13.6.0` |
| `y-protocols`   | `^1.0.6`  |
| `react`         | `^19.0.0` |
| `react-dom`     | `^19.0.0` |
| `@xyflow/react` | `^12.9.0` |

The `/react` subpath keeps your final bundle from shipping a second copy of
React. It is also the entry that exports the `<Apollon>` React component — the
recommended way to embed in React. See [React](/library/embedding/react).

## Fully external build (any bundler host)

```sh
npm install @tumaet/apollon \
  yjs y-protocols \
  react react-dom \
  @xyflow/react
```

```ts
import { ApollonEditor } from "@tumaet/apollon/external"
import "@tumaet/apollon/style.css"
```

Same imperative `ApollonEditor` API as the default entry, but **every**
dependency is external — the React family above _and_ Apollon's own runtime
deps (`@base-ui/react`, `lucide-react`, `@dnd-kit`, `zustand`, `uuid`,
`@chenglou/pretext`), which arrive transitively with the package. Your bundler
resolves and de-duplicates each one against your app's `node_modules`, and your
bundle analyzer / SBOM tooling sees them as real packages instead of code
inlined invisibly into one chunk. Use it from any framework with a bundler,
including non-React ones (the editor still runs on the React you provide
internally; your own code never touches it).

## Type definitions

Types ship with the package (`dist/index.d.ts`) and are identical for every subpath. Requires TypeScript 5.0+ with `moduleResolution: "bundler" | "node16" | "nodenext"`.
