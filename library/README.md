<div align="center">

# @tumaet/apollon

[![npm version](https://img.shields.io/npm/v/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![npm downloads](https://img.shields.io/npm/dm/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![license](https://img.shields.io/npm/l/@tumaet/apollon)](https://github.com/ls1intum/Apollon/blob/main/LICENSE)
[![types included](https://img.shields.io/npm/types/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)

**Embeddable UML modeling editor for the web.** Mounts into any DOM node and works inside Angular, Vue, Svelte, vanilla JS, or React.

[**▶ Live demo**](https://apollon.aet.cit.tum.de) · [Docs](https://ls1intum.github.io/Apollon/library/) · [API reference](https://ls1intum.github.io/Apollon/library/api) · [Examples](https://ls1intum.github.io/Apollon/library/embedding/react) · [GitHub](https://github.com/ls1intum/Apollon)

<!-- Absolute URL on purpose: this README is rendered on npmjs.com, where
     repo-relative image paths do not resolve. The PNG is generated from the
     live editor by the readme-assets Playwright project. -->

[![The Apollon editor showing a UML class diagram, with the element palette on the left](https://raw.githubusercontent.com/ls1intum/Apollon/main/docs/static/img/apollon-editor-light.png)](https://apollon.aet.cit.tum.de)

</div>

---

Apollon is the modeling editor behind [Artemis](https://artemis.tum.de/), TUM's interactive learning platform. The API is imperative: you call `new ApollonEditor(container, options)` and the editor renders its own React tree inside that node, so your own code never touches React. In a React app, render the [`<Apollon>` component](#react) instead.

## Features

- **13 diagram types**: class, object, activity, use case, communication, component, deployment, Petri net, reachability graph, syntax tree, flowchart, BPMN, and SFC.
- **Framework-agnostic**: one imperative API for Angular, Vue, Svelte, and vanilla JS, plus a React component, hooks, and provider.
- **Real-time collaboration**: opt-in multi-user editing over [Yjs](https://yjs.dev/), with any transport you like (WebSocket, WebRTC, BroadcastChannel).
- **Export**: SVG and JSON are built in. Generate PNG and PDF from the SVG (see [Export](#export)).
- **Canvas overlays**: inject your own toolbars, banners, and rails into the editor canvas; Apollon measures reserving controls and places them with the built-in chrome — `<ApollonControl>` (React) or `addControl` / `getRegionElement` (any framework). See [Overlay controls](https://ls1intum.github.io/Apollon/library/api/overlay-controls).
- **Internationalization**: override the editor UI strings exposed in `ApollonLabels` (tooltips, aria-labels, edit/assessment popovers) via `labels` / `setLabels` / `useLabels`. See [i18n](https://ls1intum.github.io/Apollon/library/api/overlay-controls#i18n).
- **Assessment mode**: attach scores and feedback to elements. This is the grading workflow Artemis uses.
- **TypeScript**: type definitions are included.

## Install

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

Apollon ships **one** build with every runtime dependency left external — the React family (`react`, `react-dom`, `@xyflow/react`), the CRDT singletons (`yjs`, `y-protocols`), and Apollon's own UI deps (`@base-ui/react`, `lucide-react`, `@dnd-kit`, `zustand`, `@chenglou/pretext`), which arrive transitively when you install the package. Your bundler resolves and de-duplicates each one against your app's `node_modules`, and your bundle analyzer / SBOM tooling sees them as the real packages they are — never a copy inlined invisibly into one chunk. This works from any framework with a bundler (Angular, Vue, Svelte, React).

These are the peers you install explicitly:

| Peer            | Range     | Powers                                                |
| --------------- | --------- | ----------------------------------------------------- |
| `react`         | `^19.0.0` | the editor's rendering                                |
| `react-dom`     | `^19.0.0` | the editor's rendering                                |
| `@xyflow/react` | `^12.9.0` | the diagram canvas                                    |
| `yjs`           | `^13.6.0` | the document model, undo/redo, and live collaboration |
| `y-protocols`   | `^1.0.6`  | collaboration sync/awareness                          |

Most package managers install missing peers automatically; the explicit command above is listed for clarity. Keeping these external means a host that already uses React or Yjs shares a single instance with the editor instead of loading a private, possibly mismatched copy — no duplicate payload, and no "Invalid hook call" or cross-instance-document errors.

### Non-React hosts (Angular, Vue, Svelte, vanilla)

The API is imperative — `new ApollonEditor(container, options)` — and the editor renders its own React tree inside the container, so your own code never imports or touches React. You still install the React peers (the editor uses them internally), but Apollon is the only thing on the page that does.

### React hosts

Import the `<Apollon>` component, hooks, and provider from the same entry: `import { Apollon } from "@tumaet/apollon"`. They render on the React you already have. Because the package is side-effect-free except for CSS, non-React hosts tree-shake the component and hooks out automatically.

> **⚠️ Give the container an explicit, non-zero height** (`600px`, `80vh`, or a sized flex/grid child). The canvas sizes itself to its parent, so with no resolvable height it collapses to zero pixels and renders blank. This is the most common embedding mistake. See [Troubleshooting](https://ls1intum.github.io/Apollon/library/troubleshooting).

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

Render the `<Apollon>` component from `@tumaet/apollon`. It owns the editor's lifecycle: it constructs on mount and destroys on unmount.

```tsx
import { Apollon } from "@tumaet/apollon"
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

```ts no-check
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
<link rel="stylesheet" href="https://esm.sh/@tumaet/apollon@5.1.1/style.css" />
<div id="apollon" style="width: 100%; height: 600px"></div>

<script type="module">
  import { ApollonEditor } from "https://esm.sh/@tumaet/apollon@5.1.1"

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

```ts no-check
const editor = new ApollonEditor(container, { collaborationEnabled: true })

// Outbound: the editor calls back when it has bytes to send.
editor.sendBroadcastMessage((base64) => transport.send(base64))

// Inbound: forward every received frame back to the editor.
transport.onMessage((base64) => editor.receiveBroadcastedMessage(base64))
```

To let the library render participant presence, live cursors, and remote node/edge selection highlights, pass the optional `collaboration` UI config:

```ts no-check
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
- **PNG / PDF**: not built in, but the library ships `svgToPng` / `svgToPdf` renderers under [`@tumaet/apollon/export`](https://ls1intum.github.io/Apollon/library/api/export) (PNG via `@resvg/resvg-wasm`, PDF via `svg2pdf.js` + `jspdf`, installed as optional peers). The standalone server in this repo renders server-side instead, with `@napi-rs/canvas` (PNG) and `pdfmake` (PDF).

See [Export](https://ls1intum.github.io/Apollon/library/api/export) for the full `ExportOptions`.

## Theming

Theme the editor through the `--apollon-*` CSS custom properties (typed via
`createApollonTheme`) plus a `data-theme` light/dark switch — framework-agnostic,
Tailwind-free. A first rebrand is three tokens: `primary`, `background`,
`foreground`.

```tsx
import { Apollon, createApollonTheme } from "@tumaet/apollon"

declare const dark: boolean // your app's light/dark state
;<Apollon
  style={{ height: "80vh" }}
  theme={createApollonTheme({
    primary: "#ff5722",
    background: "#fff",
    foreground: "#1a1a1a",
  })}
  dataTheme={dark ? "dark" : undefined}
/>
```

See [Theming](https://ls1intum.github.io/Apollon/library/theming) (or
[`THEMING.md`](./THEMING.md)) for the full contract, dark mode, and host patterns.

## Documentation

- [Library overview](https://ls1intum.github.io/Apollon/library/): install, quickstart, embedding
- [Theming](https://ls1intum.github.io/Apollon/library/theming): the `--apollon-*` contract, `createApollonTheme`, light/dark
- [API reference](https://ls1intum.github.io/Apollon/library/api): the full `ApollonEditor` and `<Apollon>` surface
- [Troubleshooting](https://ls1intum.github.io/Apollon/library/troubleshooting): blank canvas, SSR, duplicate React, and other gotchas

The server-side wire protocol is exposed through the `@tumaet/apollon/internals` subpath. It is unstable and not covered by SemVer.

## Related

- Source and issues: <https://github.com/ls1intum/Apollon>
- Live editor: <https://apollon.aet.cit.tum.de>
- The standalone web editor, collaboration server, and [VS Code extension](https://marketplace.visualstudio.com/items?itemName=aet-tum.apollon-extension) live in the same monorepo.

## License

MIT. See [LICENSE](https://github.com/ls1intum/Apollon/blob/main/LICENSE).
