---
id: overview
title: Overview
description: Embeddable UML modeling editor. One external build that shares the host's React, xyflow, and Yjs.
slug: /
---

# `@tumaet/apollon`

[![npm version](https://img.shields.io/npm/v/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![npm license](https://img.shields.io/npm/l/@tumaet/apollon)](https://github.com/ls1intum/Apollon/blob/main/LICENSE)

Apollon ships as an npm library that any framework can embed. The public API is **imperative** (`new ApollonEditor(container, options)`), so your host code does not need to use React — but the library does, and it mounts its own React tree (UI primitives powered by Base UI) inside the DOM node you give it.

13 UML and modeling diagram types · SVG/PNG/PDF/JSON export · optional real-time collaboration via Yjs · injectable [canvas overlay controls](/library/api/overlay-controls).

## One build, every framework

`@tumaet/apollon` ships a single build that externalizes every runtime
dependency a host can install — the React family (`react`, `react-dom`,
`@xyflow/react`), the CRDT singletons (`yjs`, `y-protocols`), and Apollon's own
runtime deps (`@base-ui/react`, `lucide-react`, `@dnd-kit`, `zustand`, `uuid`,
`@chenglou/pretext`), which install transitively with the package. Your bundler
resolves and de-duplicates each one against your app's `node_modules`, and your
bundle analyzer / SBOM tooling sees them as the real packages they are — never a
copy inlined invisibly into one chunk.

The API is imperative (`new ApollonEditor(container, options)`) and works from
any framework with a bundler — Angular ([Artemis](https://artemis.tum.de/)),
Vue, Svelte, React. React hosts additionally get the `<Apollon>` component,
hooks, and provider from the same entry, rendering on the React they already
have. `react`, `react-dom`, and `@xyflow/react` are required peers (joining
`yjs` / `y-protocols`); most package managers add missing peers automatically.

## What's next

- **[Quickstart](/library/quickstart)** — the smallest working embed
- **[Install](/library/embedding/install)** — package + peer deps for your framework
- **[Embedding examples](/library/embedding/angular)** — Angular, React, vanilla JS
- **[API reference](/library/api)** — the complete `ApollonEditor` surface
- **[Theming](/library/theming)** — `--apollon-*` tokens, `createApollonTheme`, light/dark
- **[Collaboration](/library/api/collaboration)** — Yjs-based real-time sync
- **[Export](/library/api/export)** — SVG / PNG / PDF / JSON
- **[Overlay controls](/library/api/overlay-controls)** — inject toolbars, banners, and rails into the canvas
- **[Troubleshooting](/library/troubleshooting)** — blank canvas, SSR, and other embedding gotchas
