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

## Two builds, one API

| Subpath                       | React / MUI / emotion / xyflow | Bundle  | When to use                                                                                                                                                                          |
| ----------------------------- | ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@tumaet/apollon` _(default)_ | bundled                        | ~2.4 MB | Any framework that doesn't already have React installed — Angular (the primary use case for [Artemis](https://artemis.tum.de/)), Vue, Svelte, vanilla JS. Zero peer deps to install. |
| `@tumaet/apollon/react`       | externalized                   | ~875 KB | React 18.3 hosts that want to share their React instance with the editor and dedupe the bundle.                                                                                      |

`peerDependenciesMeta.optional` covers all six peers — `npm install @tumaet/apollon` never warns about missing React.

## What's next

- **[Quickstart](/library/quickstart)** — the smallest working embed
- **[Install](/library/embedding/install)** — package + peer deps for your framework
- **[Embedding examples](/library/embedding/angular)** — Angular, React, vanilla JS
- **[API reference](/library/api)** — the complete `ApollonEditor` surface
- **[Collaboration](/library/api/collaboration)** — Yjs-based real-time sync
- **[Export](/library/api/export)** — SVG / PNG / PDF / JSON
- **[Overlay controls](/library/api/overlay-controls)** — inject toolbars, banners, and rails into the canvas
- **[Troubleshooting](/library/troubleshooting)** — blank canvas, SSR, and other embedding gotchas
