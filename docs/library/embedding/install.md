---
id: install
title: Install
description: Pick a subpath, install the library, ship.
---

# Install

## Standalone build (any framework)

```sh
npm install @tumaet/apollon
```

```ts
import { ApollonEditor } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"
```

No further installs — React, MUI, emotion, and xyflow are bundled inside the library tarball.

## Peer-dependency build (React hosts)

```sh
npm install @tumaet/apollon \
  react react-dom \
  @emotion/react @emotion/styled @mui/material @xyflow/react
```

```ts
import { ApollonEditor } from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"
```

| Peer              | Range      |
| ----------------- | ---------- |
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
