---
id: install
title: Install
description: Install @tumaet/apollon and its peer dependencies.
---

# Install

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

Apollon externalizes every runtime dependency, so your bundler resolves and
de-duplicates each one and your SBOM tooling attributes it correctly (see
[Overview](/library/)). Use it from any framework with a bundler (Angular, Vue,
Svelte, React); install the peers below alongside the package.

## Peer dependencies

| Peer            | Range     | Powers                                                |
| --------------- | --------- | ----------------------------------------------------- |
| `react`         | `^19.0.0` | the editor's rendering                                |
| `react-dom`     | `^19.0.0` | the editor's rendering                                |
| `@xyflow/react` | `^12.9.0` | the diagram canvas                                    |
| `yjs`           | `^13.6.0` | the document model, undo/redo, and live collaboration |
| `y-protocols`   | `^1.0.6`  | collaboration sync/awareness                          |

Most package managers install missing peers automatically. Keeping these
external lets a host that already uses React or Yjs share a single instance with
the editor instead of loading a private, possibly mismatched copy — no duplicate
payload and no "Invalid hook call" or cross-instance-document errors.

## React vs non-React hosts

The API is imperative — `new ApollonEditor(container, options)` — and the editor
renders its own React tree inside the container, so non-React hosts (Angular,
Vue, Svelte, vanilla) never import React themselves; they only install it as a
peer the editor uses internally.

React hosts import the `<Apollon>` component, hooks, and provider from the same
entry — `import { Apollon } from "@tumaet/apollon"` — rendering on the React they
already have. See [React](/library/embedding/react). Because the package is
side-effect-free except for CSS, non-React hosts tree-shake the component out.

## No bundler (CDN)

On the CDN path, esm.sh resolves and serves the peers from the import URL
automatically — there is nothing extra to load. See
[Vanilla JS / CDN](/library/embedding/vanilla).

## Type definitions

Types ship with the package (`dist/index.d.ts`). Requires TypeScript 5.0+ with `moduleResolution: "bundler" | "node16" | "nodenext"`.
