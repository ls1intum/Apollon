---
id: overview
title: Overview
description: Embeddable UML modeling editor. Framework-agnostic by default; React-shared opt-in for bundle dedupe.
slug: /
---

# `@tumaet/apollon`

[![npm version](https://img.shields.io/npm/v/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![npm license](https://img.shields.io/npm/l/@tumaet/apollon)](https://github.com/ls1intum/Apollon/blob/main/LICENSE)

Apollon ships as an npm library that any framework can embed. The public API is **imperative** (`new ApollonEditor(container, options)`), so your host code does not need to use React — but the library does, and it mounts its own React tree inside the DOM node you give it.

13 UML and modeling diagram types · SVG/PNG/PDF/JSON export · optional real-time collaboration via Yjs · injectable [canvas overlay controls](/library/api/overlay-controls).

## Three builds, one API

| Subpath                       | Dependencies             | Bundle  | When to use                                                                                                                      |
| ----------------------------- | ------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `@tumaet/apollon` _(default)_ | all bundled (except Yjs) | ~2.4 MB | No bundler — vanilla JS, a `<script>` tag, or a CDN. Self-contained; only `yjs` + `y-protocols` to install.                      |
| `@tumaet/apollon/react`       | React family external    | ~875 KB | A React host that shares its own React/MUI and wants the `<Apollon>` component.                                                  |
| `@tumaet/apollon/external`    | everything external      | ~840 KB | A bundler host of any framework — Angular, Vue, Svelte, React — that wants one shared, fully auditable copy of every dependency. |

`peerDependenciesMeta.optional` covers the six React-family peers, so `npm install @tumaet/apollon` never warns about missing React. `yjs` and `y-protocols` are required peers of all builds — they power Apollon's document model and undo/redo (and live collaboration when enabled), so the editor needs them either way, and keeping them external lets a host that already uses Yjs own a single instance. Most package managers add them automatically. The `/external` entry additionally externalizes Apollon's own runtime deps (`@dnd-kit`, `zustand`, `uuid`, `@chenglou/pretext`), which install transitively with the package.

## What's next

- **[Quickstart](/library/quickstart)** — the smallest working embed
- **[Install](/library/embedding/install)** — package + peer deps for your framework
- **[Embedding examples](/library/embedding/angular)** — Angular, React, vanilla JS
- **[API reference](/library/api)** — the complete `ApollonEditor` surface
- **[Collaboration](/library/api/collaboration)** — Yjs-based real-time sync
- **[Export](/library/api/export)** — SVG / PNG / PDF / JSON
- **[Overlay controls](/library/api/overlay-controls)** — inject toolbars, banners, and rails into the canvas
- **[Troubleshooting](/library/troubleshooting)** — blank canvas, SSR, and other embedding gotchas
