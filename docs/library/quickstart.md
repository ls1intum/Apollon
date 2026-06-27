---
id: quickstart
title: Quickstart
description: The smallest working Apollon embed — install, mount, render.
---

# Quickstart

The smallest working embed, framework-neutral. If your host is React, Angular,
or plain HTML, the [Embedding](/library/embedding/install) pages have the
idiomatic version — but the two steps below are all Apollon needs.

## 1. Install

```sh
npm install @tumaet/apollon react react-dom @xyflow/react yjs y-protocols
```

Apollon externalizes its dependencies, so you install them as peers: `react`,
`react-dom`, `@xyflow/react`, `yjs`, and `y-protocols`. Most package managers
add missing peers automatically. They are kept external so a host that already
uses React or Yjs shares one instance with the editor — see
[Install](/library/embedding/install).

:::danger The editor MUST have an explicit height
Apollon renders onto a React Flow canvas, which sizes itself to its parent. If
the container has no resolvable height — no `height`, or a percentage height
whose ancestors are not themselves sized — the canvas collapses to **zero
pixels and the editor renders blank**. This is the single most common embedding
mistake.

Give the container an explicit `height` (`600px`, `80vh`, or a child of a
sized flex or grid parent). The width can be `100%`; only the height bites.
See [Troubleshooting](/library/troubleshooting) for the full diagnosis.
:::

## 2. Mount the editor

### React hosts

Install the `/react` subpath (see [Install](/library/embedding/install)) and
render the `<Apollon>` component. It owns the editor's lifecycle.

```tsx
import { Apollon } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

export function Diagram() {
  return <Apollon style={{ height: 600 }} />
}
```

The `style` prop sizes the editor's container — the explicit height is what
keeps the canvas from rendering blank. See [React](/library/embedding/react)
for the full prop surface, the `useApollonEditor` / `useApollonSubscription`
hooks, ref handling, and SSR.

### Non-React hosts

Angular, Vue, Svelte, and vanilla JS construct the imperative `ApollonEditor`
directly. Give it a sized container:

```html
<div id="apollon" style="width: 100%; height: 600px"></div>
```

```ts
import { ApollonEditor } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

const container = document.getElementById("apollon")
if (!container) throw new Error("#apollon container missing")

const editor = new ApollonEditor(container)
```

The stylesheet import is mandatory in both paths — without
`@tumaet/apollon/style.css` the editor mounts unstyled. The constructor throws
if `container` is not an `HTMLElement`.

## What you should see

A full-bleed modeling canvas filling the 600 px-tall container: a sidebar of
draggable UML elements, a toolbar, and an empty grid. Drag an element onto the
grid to start a class diagram.

Read the current diagram, replace it, and observe changes:

```ts
const model = editor.model // UMLModel as plain JSON
editor.model = model // round-trip safe

const id = editor.subscribeToModelChange((next) => console.log(next))
editor.unsubscribe(id)
```

## Tear down

Always destroy the editor before removing its container or mounting a new one
on the same node:

```ts
editor.destroy()
```

## Next steps

- [Install](/library/embedding/install) — standalone vs. `/react` build, peer deps
- [React](/library/embedding/react) · [Angular](/library/embedding/angular) · [Vanilla JS / CDN](/library/embedding/vanilla)
- [API reference](/library/api) — the complete `ApollonEditor` surface
- [Overlay controls](/library/api/overlay-controls) — inject your own chrome into the canvas
- [Troubleshooting](/library/troubleshooting) — blank canvas, SSR, and other embedding gotchas
