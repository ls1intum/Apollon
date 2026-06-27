---
id: troubleshooting
title: Troubleshooting
description: Fixes for the common Apollon embedding failures — blank canvas, SSR crashes, missing styles, and React duplication.
---

# Troubleshooting

The failures below account for nearly every "it doesn't work" report. They are
all embedding issues, not bugs in the editor.

## The editor renders blank / has zero height

**Symptom.** The constructor runs without throwing, but the container shows
nothing — or a thin sliver, or just the toolbar with no canvas.

**Cause.** Apollon renders onto a React Flow canvas that sizes itself to its
parent. If the container's height does not resolve to a positive pixel value,
the canvas collapses to zero.

A percentage height (`height: 100%`) only resolves if **every ancestor up to a
sized element** also has a resolvable height. A bare `<div>` in document flow
has no height of its own.

**Fix.** Give the container an explicit height:

```html
<div id="apollon" style="width: 100%; height: 600px"></div>
```

Acceptable heights: a fixed value (`600px`), a viewport unit (`80vh`), or a
percentage **only** when the parent chain is sized (a flex/grid child with
`flex: 1`, or `height: 100%` all the way up to a sized root). Width almost
never causes this — only height does.

If the container is sized correctly but the editor still looks empty, call
`editor.fitView()` after mounting: a model loaded into an off-screen viewport
can render outside the visible area.

## The editor crashes during SSR / "window is not defined"

**Symptom.** `ReferenceError: window is not defined` (or `document is not
defined`) at build time or on the server, in Next.js, Remix, Nuxt, SvelteKit,
or Angular Universal.

**Cause.** `ApollonEditor` is client-only. It calls `ReactDOM.createRoot` and
touches `window` / `document` during construction. None of that can run in a
server render pass.

**Fix.** Construct the editor only after the component has mounted on the
client — never during render.

- **React / Next.js.** Build inside `useEffect`, and mark the file
  `"use client"`. To keep the module out of the server bundle entirely, load
  the wrapper with `next/dynamic` and `ssr: false`:

  ```tsx
  import dynamic from "next/dynamic"

  const DiagramEditor = dynamic(() => import("./DiagramEditor"), {
    ssr: false,
  })
  ```

- **Angular (17.3+).** Construct inside `afterNextRender(() => …)` — the
  callback is a no-op on the server, so the snippet is SSR-safe by construction.
  Older codebases on Angular 16 or earlier should guard with
  `isPlatformBrowser(this.platformId)` inside `ngAfterViewInit`.

- **Svelte / Vue / vanilla.** Construct inside `onMount` / `mounted` / a
  client-side script — anything that runs only in the browser.

## The editor mounts unstyled

**Symptom.** The editor appears, but with no theme — unstyled controls,
misaligned elements, missing icons.

**Cause.** The stylesheet was never imported. Apollon ships its CSS as a
separate file; importing the JS does not pull it in.

**Fix.** Import the stylesheet once, anywhere in your app:

```ts
import "@tumaet/apollon/style.css"
```

For a CDN / plain-HTML host, link it instead — see
[Vanilla JS / CDN](/library/embedding/vanilla).

## Two copies of React (`/react` subpath vs. default build)

**Symptom.** In a React host: hook errors ("Invalid hook call", "more than one
copy of React"), broken context, or a bundle that is larger than expected.

**Cause.** The default `@tumaet/apollon` build **bundles its own copy** of
React and xyflow. That is correct for non-React hosts, but in a
React app it ships a second React that fights the host's.

**Fix.** In a React host, import from the `/react` subpath and install the
peer dependencies:

```ts
import { ApollonEditor } from "@tumaet/apollon/react"
```

The `/react` build externalizes React and friends so the editor shares the
host's single instance. Non-React hosts (Angular, Vue, Svelte, vanilla) should
keep the default `@tumaet/apollon` import. See
[Install](/library/embedding/install) for the peer-dependency list.

## Re-mounting leaks or double-renders

**Symptom.** After navigating away and back, the editor renders twice, stale
subscriptions keep firing, or memory grows.

**Cause.** A previous `ApollonEditor` instance was never torn down. The editor
owns a React root, a Yjs document, and active subscriptions.

**Fix.** Always call `editor.destroy()` before discarding the instance or
mounting a new one on the same container. In a React `useEffect`, do this in
the cleanup function. `destroy()` unmounts the React tree, stops sync, drops
every subscription, and destroys the Yjs doc.

## `editor.getNodes()` / `getViewport()` returns empty or null

**Symptom.** Calling geometry methods right after `new ApollonEditor(...)`
returns `[]` or `null`.

**Cause.** React Flow initializes asynchronously. Immediately after the
constructor the instance is not yet wired up.

**Fix.** These methods are safe to call once the editor is interactive — in a
subscription callback, an event handler, or after a `requestAnimationFrame`.
`getNodes()` and `getEdges()` return `[]` and `getViewport()` returns `null`
until then; `fitView()` already retries internally and is safe to call right
away.
