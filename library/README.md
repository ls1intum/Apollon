# @tumaet/apollon

[![npm version](https://img.shields.io/npm/v/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![npm license](https://img.shields.io/npm/l/@tumaet/apollon)](https://github.com/ls1intum/Apollon/blob/main/LICENSE)

Embeddable UML modeling editor. Mounts into any DOM node. The public API is imperative (`new ApollonEditor(container, options)`), so the editor renders its own React tree inside the container you give it — your host code does **not** need to use React. 13 diagram types, SVG/PNG/PDF/JSON export, optional real-time collaboration via Yjs.

## Install

The package ships two builds with identical APIs:

| Subpath                       | React / MUI / emotion / xyflow | Bundle  | Use when                                                                                                   |
| ----------------------------- | ------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------- |
| `@tumaet/apollon` _(default)_ | bundled                        | ~2.2 MB | Your host is Angular, Vue, Svelte, vanilla JS, or any framework that doesn't already have React installed. |
| `@tumaet/apollon/react`       | externalized (peer deps)       | ~860 KB | Your host is React 18.3+ and you want the editor to share React with your app instead of bundling a copy.  |

### Standalone build (any framework, no peer deps)

```sh
npm install @tumaet/apollon
```

```ts
import { ApollonEditor } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"
```

No further installs needed — React, MUI, emotion, and xyflow are bundled inside the library.

### Peer-dependency build (React hosts)

```sh
npm install @tumaet/apollon \
  react react-dom \
  @emotion/react @emotion/styled @mui/material @xyflow/react
```

```ts
import { ApollonEditor } from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"
```

Peer ranges: `react ^18.3`, `react-dom ^18.3`, `@mui/material ^6.4`, `@emotion/react ^11.11`, `@emotion/styled ^11.11`, `@xyflow/react ^12.3`. Picking this build keeps the final bundle from shipping a second copy of React.

Peers are declared with `peerDependenciesMeta.optional` so `npm install @tumaet/apollon` never warns about missing peers when you only use the standalone subpath.

## Usage

```ts
import {
  ApollonEditor,
  ApollonMode,
  Locale,
  UMLDiagramType,
} from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

const container = document.getElementById("apollon")
if (!container) throw new Error("#apollon container missing")

const editor = new ApollonEditor(container, {
  type: UMLDiagramType.ClassDiagram,
  mode: ApollonMode.Modelling,
  locale: Locale.en,
})

console.log(editor.model)
editor.model = nextModel

const subscriptionId = editor.subscribeToModelChange((model) => {
  // persist / broadcast
})

const svg = await editor.exportAsSVG({ svgMode: "web" })

editor.unsubscribe(subscriptionId)
editor.destroy()
```

The editor is client-only. In SSR frameworks (Next.js, Remix, SvelteKit, Nuxt), construct from a client-side effect — never during render. Always call `editor.destroy()` before re-mounting on the same container.

Type definitions ship with the package (`dist/index.d.ts`) and are identical for both subpaths. Requires TypeScript 5.0+ with `moduleResolution: "bundler" | "node16" | "nodenext"`.

## Embedding examples

### Angular

```ts
import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from "@angular/core"
import {
  ApollonEditor,
  ApollonMode,
  Locale,
  UMLDiagramType,
} from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

@Component({
  selector: "app-diagram-editor",
  standalone: true,
  template: `<div #container style="width: 100%; height: 100%"></div>`,
})
export class DiagramEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild("container", { static: true })
  containerRef!: ElementRef<HTMLDivElement>

  private editor?: ApollonEditor

  ngAfterViewInit(): void {
    this.editor = new ApollonEditor(this.containerRef.nativeElement, {
      type: UMLDiagramType.ClassDiagram,
      mode: ApollonMode.Modelling,
      locale: Locale.en,
    })
  }

  ngOnDestroy(): void {
    this.editor?.destroy()
  }
}
```

### React

Use the `<Apollon>` component from the `@tumaet/apollon/react` subpath. Render
a saved diagram and persist edits — the loop you'll actually write:

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

The component owns the editor's lifecycle (constructs on mount, destroys on
unmount). For imperative control, construct `ApollonEditor` yourself — see the
[React embedding guide](https://ls1intum.github.io/Apollon/library/embedding/react).

### Vanilla JS / CDN

```html
<link
  rel="stylesheet"
  href="https://unpkg.com/@tumaet/apollon/dist/assets/style.css"
/>
<div id="apollon" style="width: 100%; height: 600px"></div>
<script type="module">
  import {
    ApollonEditor,
    ApollonMode,
    Locale,
    UMLDiagramType,
  } from "https://unpkg.com/@tumaet/apollon"

  const editor = new ApollonEditor(document.getElementById("apollon"), {
    type: UMLDiagramType.ClassDiagram,
    mode: ApollonMode.Modelling,
    locale: Locale.en,
  })
</script>
```

## Supported diagrams

Class, Object, Activity, Use Case, Communication, Component, Deployment, Petri Net, Reachability Graph, Syntax Tree, Flowchart, BPMN, SFC. See `UMLDiagramType` in `dist/index.d.ts` for the exact enum.

## Real-time collaboration

Opt-in and transport-agnostic. Set `collaborationEnabled: true`, then wire your transport:

```ts
editor.sendBroadcastMessage((base64) => transport.send(base64))
transport.onMessage((base64) => editor.receiveBroadcastedMessage(base64))
```

Use any Yjs-compatible transport (WebSocket, WebRTC, `y-websocket`, etc.).

## Export

- `editor.exportAsSVG(options)` resolves to `{ svg, clip }`.
- PNG and PDF use the same pipeline via `ExportOptions` (`svgMode: "web" | "compat"`); see `dist/index.d.ts`.
- `editor.model` returns the `UMLModel` as JSON.

## Related

- Source and issue tracker: <https://github.com/ls1intum/Apollon>
- Standalone web editor, server, and VS Code extension live in the same monorepo.
- Developed alongside [Artemis](https://artemis.tum.de/), TUM's interactive learning platform.

## License

MIT — see [LICENSE](https://github.com/ls1intum/Apollon/blob/main/LICENSE).
