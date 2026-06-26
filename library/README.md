<div align="center">

# @tumaet/apollon

[![npm version](https://img.shields.io/npm/v/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![npm downloads](https://img.shields.io/npm/dm/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![license](https://img.shields.io/npm/l/@tumaet/apollon)](https://github.com/ls1intum/Apollon/blob/main/LICENSE)
[![types included](https://img.shields.io/npm/types/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)

**Embeddable UML modeling editor for the web.** Mounts into any DOM node and works inside Angular, Vue, Svelte, vanilla JS, or React.

[**▶ Live demo**](https://apollon.aet.cit.tum.de) · [Docs](https://ls1intum.github.io/Apollon/library/) · [API reference](https://ls1intum.github.io/Apollon/library/api) · [Examples](https://ls1intum.github.io/Apollon/library/embedding/react) · [GitHub](https://github.com/ls1intum/Apollon)

</div>

---

Apollon is the modeling editor behind [Artemis](https://artemis.tum.de/), TUM's interactive learning platform. The API is imperative: you call `new ApollonEditor(container, options)` and the editor renders its own React tree inside that node, so your own code never touches React. In a React app, render the [`<Apollon>` component](#react) instead.

## Features

- **13 diagram types**: class, object, activity, use case, communication, component, deployment, Petri net, reachability graph, syntax tree, flowchart, BPMN, and SFC.
- **Framework-agnostic**: one imperative API for Angular, Vue, Svelte, and vanilla JS, plus a React component, hooks, and provider.
- **Real-time collaboration**: opt-in multi-user editing over [Yjs](https://yjs.dev/), with any transport you like (WebSocket, WebRTC, BroadcastChannel).
- **Export**: SVG and JSON are built in. Generate PNG and PDF from the SVG (see [Export](#export)).
- **Canvas overlays**: inject your own toolbars, banners, and rails into the editor canvas, collision-free with built-in chrome — `<ApollonControl>` (React) or `addControl` / `getRegionElement` (any framework). See [Overlay controls](https://ls1intum.github.io/Apollon/library/api/overlay-controls).
- **Assessment mode**: attach scores and feedback to elements. This is the grading workflow Artemis uses.
- **TypeScript**: type definitions are included.

## Install

The package ships three builds with the same imperative API. Pick one based on how your host bundles (or doesn't):

| Import                        | Dependencies                 | Size (min / gzip) | Use when                                                                                                                                                          |
| ----------------------------- | ---------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@tumaet/apollon` _(default)_ | **all bundled** (except Yjs) | ~2.4 MB / ~540 KB | No bundler — vanilla JS, a `<script>` tag, or a CDN. Self-contained; only `yjs` + `y-protocols` to install.                                                       |
| `@tumaet/apollon/react`       | **React family external**    | ~875 KB / ~170 KB | A React host that shares its own React and MUI with the editor. Also ships the `<Apollon>` component, hooks, provider.                                            |
| `@tumaet/apollon/external`    | **everything external**      | ~840 KB / ~175 KB | A bundler host (Angular, Vue, Svelte, React) that wants every dependency resolved from its own `node_modules` — one shared copy and full SBOM / audit visibility. |

Sizes are the published entry chunks. Gzip is the transfer size. The `/react` and `/external` numbers exclude the peers your app already ships.

`yjs` and `y-protocols` are required peer dependencies of **all three** builds — they power Apollon's document model and undo/redo (and live collaboration when you enable it), so every editor needs them, collaboration or not. Keeping them external means a host that already uses Yjs (or a second Apollon on the page) shares a single Yjs instance instead of loading a private, possibly mismatched copy. Most package managers install missing peers automatically; the explicit commands below are listed for clarity.

### Standalone build (any framework)

```sh
npm install @tumaet/apollon yjs y-protocols
```

```ts
import { ApollonEditor } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"
```

React, MUI, emotion, and xyflow are bundled in; only `yjs` and `y-protocols` are peers you provide.

### React build (share your host's React)

```sh
npm install @tumaet/apollon \
  yjs y-protocols \
  react react-dom \
  @emotion/react @emotion/styled @mui/material @xyflow/react
```

```tsx
import { Apollon } from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"
```

`yjs` and `y-protocols` are required for all builds; the React, MUI, emotion, and xyflow peers below are specific to the `/react` and `/external` builds.

| Peer          | Range     |     | Peer              | Range      |
| ------------- | --------- | --- | ----------------- | ---------- |
| `yjs`         | `^13.6.0` |     | `@mui/material`   | `^6.4.0`   |
| `y-protocols` | `^1.0.6`  |     | `@emotion/react`  | `^11.12.0` |
| `react`       | `^19.0.0` |     | `@emotion/styled` | `^11.12.0` |
| `react-dom`   | `^19.0.0` |     | `@xyflow/react`   | `^12.9.0`  |

### Fully external build (any bundler host)

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

Same imperative `ApollonEditor` API as the default entry, but **every** dependency is left external — the React family above _and_ Apollon's own runtime deps (`@dnd-kit`, `zustand`, `uuid`, `@chenglou/pretext`), which arrive transitively when you install the package. Your bundler then resolves and de-duplicates each one against your app's `node_modules`, and your bundle analyzer / SBOM tooling sees them as the real packages they are instead of code inlined invisibly into one chunk. Use this from any framework with a bundler — even a non-React one (the editor still runs on the React you provide internally; your own code never touches it).

## Which build do I use?

- **No bundler** (vanilla JS, `<script>`, CDN)? Use the default `@tumaet/apollon`. It inlines its own React, so the only peers to install are `yjs` and `y-protocols`.
- **A React app?** Use `@tumaet/apollon/react` and install the peers above. The default build bundles its own React, so in a React app you would load two copies — that causes "Invalid hook call" errors and a larger bundle. The `/react` subpath leaves React, MUI, emotion, and xyflow external so the editor shares the copies your app already has. It is also the only entry that exports the `<Apollon>` component, hooks, and provider.
- **A bundler host that wants one shared, fully auditable copy of every dependency?** Use `@tumaet/apollon/external` and install the peers above. Works from any framework.

> **⚠️ Give the container an explicit, non-zero height** (`600px`, `80vh`, or a sized flex/grid child), whichever build you use. The canvas sizes itself to its parent, so with no resolvable height it collapses to zero pixels and renders blank. This is the most common embedding mistake. See [Troubleshooting](https://ls1intum.github.io/Apollon/library/troubleshooting).

## Quick start

```ts
import { ApollonEditor, UMLDiagramType } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

const container = document.getElementById("apollon")
if (!container) throw new Error("#apollon container missing")

const editor = new ApollonEditor(container, {
  type: UMLDiagramType.ClassDiagram,
})

const subscriptionId = editor.subscribeToModelChange((model) => {
  // persist / broadcast the latest diagram JSON
})

const { svg } = await editor.exportAsSVG()

editor.unsubscribe(subscriptionId)
editor.destroy()
```

The editor is client-only. In SSR frameworks (Next.js, Remix, SvelteKit, Nuxt), construct it from a client-side effect, never during render. Always call `editor.destroy()` before re-mounting on the same container.

## Embedding examples

### React

Render the `<Apollon>` component from the `@tumaet/apollon/react` subpath. It owns the editor's lifecycle: it constructs on mount and destroys on unmount.

```tsx
import { Apollon } from "@tumaet/apollon/react"
import type { UMLModel } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

export function DiagramEditor({ initialModel }: { initialModel?: UMLModel }) {
  return (
    <Apollon
      style={{ height: 600 }}
      defaultModel={initialModel}
      onMount={(editor) => {
        const id = editor.subscribeToModelChange((model) => {
          localStorage.setItem("diagram", JSON.stringify(model))
        })
        return () => editor.unsubscribe(id)
      }}
    />
  )
}
```

Reach the instance through `ref`, the `onMount(editor)` callback, or the `useApollonEditor()` hook. See the [React embedding guide](https://ls1intum.github.io/Apollon/library/embedding/react) for hooks, the provider, and SSR.

### Angular (17.3+ signal-based)

```ts
import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  viewChild,
} from "@angular/core"
import { ApollonEditor, type UMLModel } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

@Component({
  selector: "app-diagram-editor",
  template: `<div #host style="width: 100%; height: 100%"></div>`,
})
export class DiagramEditorComponent {
  readonly initialModel = input<UMLModel>()
  private host = viewChild.required<ElementRef<HTMLDivElement>>("host")

  constructor() {
    const destroyRef = inject(DestroyRef)
    afterNextRender(() => {
      const editor = new ApollonEditor(this.host().nativeElement, {
        model: this.initialModel(),
      })
      const subId = editor.subscribeToModelChange((model) => {
        localStorage.setItem("diagram", JSON.stringify(model))
      })
      destroyRef.onDestroy(() => {
        editor.unsubscribe(subId)
        editor.destroy()
      })
    })
  }
}
```

`afterNextRender` runs only in the browser, so this is SSR-safe.

### Vanilla JS / CDN

`yjs` and `y-protocols` are required peers, but on the CDN path esm.sh resolves and serves them from the import URL automatically — there is nothing extra to load. (With a bundler you install the peers yourself.)

```html
<link rel="stylesheet" href="https://esm.sh/@tumaet/apollon@4.9.0/style.css" />
<div id="apollon" style="width: 100%; height: 600px"></div>

<script type="module">
  import { ApollonEditor } from "https://esm.sh/@tumaet/apollon@4.9.0"

  const saved = localStorage.getItem("diagram")
  const editor = new ApollonEditor(document.getElementById("apollon"), {
    model: saved ? JSON.parse(saved) : undefined,
  })

  editor.subscribeToModelChange((model) => {
    localStorage.setItem("diagram", JSON.stringify(model))
  })
</script>
```

> **⚠️ Pin an exact version**, as the URLs above do. An unpinned CDN URL resolves to `latest`, so a new major can land on the next page refresh and break your embed.

## Supported diagrams

Class, Object, Activity, Use Case, Communication, Component, Deployment, Petri Net, Reachability Graph, Syntax Tree, Flowchart, BPMN, SFC. The `UMLDiagramType` enum holds the exact string values.

## Real-time collaboration

Collaboration is opt-in and transport-agnostic. Set `collaborationEnabled: true`, then wire up your transport:

```ts
const editor = new ApollonEditor(container, { collaborationEnabled: true })

// Outbound: the editor calls back when it has bytes to send.
editor.sendBroadcastMessage((base64) => transport.send(base64))

// Inbound: forward every received frame back to the editor.
transport.onMessage((base64) => editor.receiveBroadcastedMessage(base64))
```

To let the library render participant presence, live cursors, and remote node/edge selection highlights, pass the optional `collaboration` UI config:

```ts
const editor = new ApollonEditor(container, {
  collaborationEnabled: true,
  collaboration: {
    enabled: true,
    user: { name: "Ada", color: "#1c7ed6" },
  },
})
```

Any Yjs-compatible transport works: `y-websocket`, `y-webrtc`, BroadcastChannel, or your own relay. Cursor and selection awareness travel on the same channel. See [Collaboration](https://ls1intum.github.io/Apollon/library/api/collaboration).

## Export

- **SVG**: `await editor.exportAsSVG(options)` resolves to `{ svg, clip }`. `svgMode: "web"` (the default) keeps CSS variables for theme-adaptive output; `"compat"` inlines them for PDF and Inkscape.
- **JSON**: `editor.model` returns the `UMLModel`, and assigning it back is round-trip safe. Use `importDiagram(json)` to normalize older v2/v3 models first.
- **Headless**: `ApollonEditor.exportModelAsSvg(model, options)` renders a model without a mounted editor.
- **PNG / PDF**: not built in. Generate them from the exported SVG. The standalone webapp and server in this repo do this with `@resvg/resvg-js` (PNG) and `pdfmake` (PDF).

See [Export](https://ls1intum.github.io/Apollon/library/api/export) for the full `ExportOptions`.

## Documentation

- [Library overview](https://ls1intum.github.io/Apollon/library/): install, quickstart, embedding
- [API reference](https://ls1intum.github.io/Apollon/library/api): the full `ApollonEditor` and `<Apollon>` surface
- [Troubleshooting](https://ls1intum.github.io/Apollon/library/troubleshooting): blank canvas, SSR, duplicate React, and other gotchas

The server-side wire protocol is exposed through the `@tumaet/apollon/internals` subpath. It is unstable and not covered by SemVer.

## Related

- Source and issues: <https://github.com/ls1intum/Apollon>
- Live editor: <https://apollon.aet.cit.tum.de>
- The standalone web editor, collaboration server, and [VS Code extension](https://marketplace.visualstudio.com/items?itemName=tumaet.apollon-vscode) live in the same monorepo.

## License

MIT. See [LICENSE](https://github.com/ls1intum/Apollon/blob/main/LICENSE).
