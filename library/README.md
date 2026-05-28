<div align="center">

# @tumaet/apollon

[![npm version](https://img.shields.io/npm/v/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![npm downloads](https://img.shields.io/npm/dm/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![license](https://img.shields.io/npm/l/@tumaet/apollon)](https://github.com/ls1intum/Apollon/blob/main/LICENSE)
[![types included](https://img.shields.io/npm/types/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)

**Embeddable UML modeling editor for the web.** Mounts into any DOM node — works inside Angular, Vue, Svelte, vanilla JS, or React hosts.

[**▶ Live demo**](https://apollon.aet.cit.tum.de) · [Docs](https://ls1intum.github.io/Apollon/library/) · [API reference](https://ls1intum.github.io/Apollon/library/api) · [Examples](https://ls1intum.github.io/Apollon/library/embedding/react) · [GitHub](https://github.com/ls1intum/Apollon)

</div>

---

Apollon is the modeling editor behind [Artemis](https://artemis.tum.de/), TUM's interactive learning platform. Its public API is **imperative** — `new ApollonEditor(container, options)` — so your host code never has to touch React, even though the editor mounts its own React tree inside the node you give it. React hosts get a first-class [`<Apollon>` component](#react) instead.

## Features

- **13 diagram types** — class, object, activity, use case, communication, component, deployment, Petri net, reachability graph, syntax tree, flowchart, BPMN, and SFC.
- **Framework-agnostic** — one imperative API for Angular, Vue, Svelte, and vanilla JS; a dedicated React component, hooks, and provider for React.
- **Real-time collaboration** — opt-in, transport-agnostic multi-user editing powered by [Yjs](https://yjs.dev/). Bring any WebSocket/WebRTC/BroadcastChannel transport.
- **Export** — SVG and JSON out of the box; PNG/PDF derive from the SVG pipeline (reference implementations ship in the repo).
- **Assessment mode** — attach scores and feedback to elements (the grading workflow used by Artemis).
- **TypeScript-first** — full type definitions ship with the package.

## Install

The package ships **two builds with an identical API.** Pick by whether your host already uses React:

| Import                        | React / MUI / emotion / xyflow | Size (min / gzip) | Use when                                                                                                           |
| ----------------------------- | ------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `@tumaet/apollon` _(default)_ | **bundled**                    | ~2.4 MB / ~540 KB | Your host is Angular, Vue, Svelte, vanilla JS — anything without React. Zero peer deps to install.                 |
| `@tumaet/apollon/react`       | **peer deps** (shared)         | ~875 KB / ~170 KB | Your host is React 18.3 and should share its React/MUI instance with the editor instead of bundling a second copy. |

Sizes are the published entry chunks; gzip is what ships over the wire. The `/react` figure excludes the peers your app already has.

### Standalone build — any framework, no peer deps

```sh
npm install @tumaet/apollon
```

```ts
import { ApollonEditor } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"
```

React, MUI, emotion, and xyflow are bundled inside the library — nothing else to install.

### React build — share your host's React

```sh
npm install @tumaet/apollon \
  react react-dom \
  @emotion/react @emotion/styled @mui/material @xyflow/react
```

```tsx
import { Apollon } from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"
```

| Peer            | Range     |     | Peer              | Range      |
| --------------- | --------- | --- | ----------------- | ---------- |
| `react`         | `^18.3.0` |     | `@mui/material`   | `^6.4.0`   |
| `react-dom`     | `^18.3.0` |     | `@emotion/react`  | `^11.11.0` |
| `@xyflow/react` | `^12.3.0` |     | `@emotion/styled` | `^11.11.0` |

## Which build do I use?

This is the one decision to get right up front:

- **Not a React app?** Use the default `@tumaet/apollon`. It bundles its own React, so there is nothing to install and nothing to configure.
- **A React app?** Use `@tumaet/apollon/react` and install the peers above. The default build would ship a **second copy of React** that fights your host's — causing "Invalid hook call" errors and a bloated bundle. The `/react` subpath externalizes React, MUI, emotion, and xyflow so the editor shares the single instance your app already has, and it is the **only** entry that exports the `<Apollon>` component, hooks, and provider.

> **⚠️ The container must have an explicit, non-zero height** (`600px`, `80vh`, or a sized flex/grid child) — whichever build you choose. The canvas sizes itself to its parent; without a resolvable height it collapses to zero pixels and renders blank. This is the single most common embedding mistake. See [Troubleshooting](https://ls1intum.github.io/Apollon/library/troubleshooting).

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

The editor is **client-only**. In SSR frameworks (Next.js, Remix, SvelteKit, Nuxt), construct it from a client-side effect — never during render. Always call `editor.destroy()` before re-mounting on the same container.

## Embedding examples

### React

Use the `<Apollon>` component from the `@tumaet/apollon/react` subpath — it owns the editor's lifecycle (constructs on mount, destroys on unmount):

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

Reach the instance via `ref`, the `onMount(editor)` callback, or the `useApollonEditor()` hook. See the [React embedding guide](https://ls1intum.github.io/Apollon/library/embedding/react) for hooks, the provider, and SSR.

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

`afterNextRender` runs only in the browser, so this is SSR-safe by construction.

### Vanilla JS / CDN

```html
<link rel="stylesheet" href="https://esm.sh/@tumaet/apollon@4.4.0/style.css" />
<div id="apollon" style="width: 100%; height: 600px"></div>

<script type="module">
  import { ApollonEditor } from "https://esm.sh/@tumaet/apollon@4.4.0"

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

Class, Object, Activity, Use Case, Communication, Component, Deployment, Petri Net, Reachability Graph, Syntax Tree, Flowchart, BPMN, SFC. The `UMLDiagramType` enum carries the exact wire literals.

## Real-time collaboration

Opt-in and transport-agnostic. Set `collaborationEnabled: true`, then wire your transport:

```ts
const editor = new ApollonEditor(container, { collaborationEnabled: true })

// Outbound: the editor calls back when it has bytes to send.
editor.sendBroadcastMessage((base64) => transport.send(base64))

// Inbound: forward every received frame back to the editor.
transport.onMessage((base64) => editor.receiveBroadcastedMessage(base64))
```

Any Yjs-compatible transport works — `y-websocket`, `y-webrtc`, BroadcastChannel, or your own relay. Cursor/selection awareness rides the same channel automatically. See [Collaboration](https://ls1intum.github.io/Apollon/library/api/collaboration).

## Export

- **SVG** — `await editor.exportAsSVG(options)` resolves to `{ svg, clip }`. `svgMode: "web"` (default) keeps CSS variables for theme-adaptive output; `"compat"` inlines them for PDF/Inkscape.
- **JSON** — `editor.model` returns the `UMLModel`; assignment is round-trip safe. Use `importDiagram(json)` to normalize older v2/v3 models.
- **Headless** — `ApollonEditor.exportModelAsSvg(model, options)` renders an arbitrary model with no mounted editor.
- **PNG / PDF** — produced downstream from the exported SVG. The repo's standalone app and server show reference implementations (`@resvg/resvg-js` for PNG, `pdfmake` for PDF).

See [Export](https://ls1intum.github.io/Apollon/library/api/export) for the full `ExportOptions`.

## Documentation

- [Library overview](https://ls1intum.github.io/Apollon/library/) — install, quickstart, embedding
- [API reference](https://ls1intum.github.io/Apollon/library/api) — the complete `ApollonEditor` and `<Apollon>` surface
- [Troubleshooting](https://ls1intum.github.io/Apollon/library/troubleshooting) — blank canvas, SSR, duplicate React, and other embedding gotchas

The server-side wire protocol lives behind the **unstable** `@tumaet/apollon/internals` subpath, which is explicitly **not** covered by SemVer.

## Related

- **Source & issues:** <https://github.com/ls1intum/Apollon>
- **Live editor:** <https://apollon.aet.cit.tum.de>
- The standalone web editor, collaboration server, and [VS Code extension](https://marketplace.visualstudio.com/items?itemName=tumaet.apollon-vscode) live in the same monorepo.

## License

MIT — see [LICENSE](https://github.com/ls1intum/Apollon/blob/main/LICENSE).
