# @tumaet/apollon

[![npm version](https://img.shields.io/npm/v/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![npm license](https://img.shields.io/npm/l/@tumaet/apollon)](https://github.com/ls1intum/Apollon/blob/main/LICENSE)

An embeddable UML modeling editor. Mount it into any DOM node — works inside React, Angular, Vue, Svelte, and vanilla JS hosts. 13 diagram types, SVG/PNG/PDF/JSON export, optional real-time collaboration via Yjs.

The public API is imperative (`new ApollonEditor(container, options)`), so the editor renders its own React tree inside the container you give it and does not require your host app to use React.

## Install

The package ships two builds with identical APIs:

| Subpath                       | React, MUI, emotion, xyflow | Bundle size | Use when                                                                                  |
| ----------------------------- | --------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| `@tumaet/apollon` _(default)_ | bundled                     | ~2.4 MB     | Your host app is Angular, Vue, Svelte, vanilla JS, or you do not have React installed.    |
| `@tumaet/apollon/react`       | externalized (peer deps)    | ~875 KB     | Your host app is React 18.3+ or 19+ and you want the editor to share React with your app. |

### Standalone build (any framework)

```sh
npm install @tumaet/apollon
```

```ts
import { ApollonEditor } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"
```

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

Supported peer ranges: React `^18.3.0 || ^19.0.0`, MUI `^6.4.0`, emotion `^11.11.0`, xyflow `^12.3.0`. Picking this build keeps your final bundle from shipping a second copy of React.

## Usage

```ts
import {
  ApollonEditor,
  ApollonMode,
  Locale,
  UMLDiagramType,
} from "@tumaet/apollon"

const container = document.getElementById("apollon")
if (!container) throw new Error("#apollon container missing")

const editor = new ApollonEditor(container, {
  type: UMLDiagramType.ClassDiagram,
  mode: ApollonMode.Modelling,
  locale: Locale.en,
  // model, theme, readonly, enablePopups, colorEnabled, scale,
  // collaborationEnabled, scrollLock — see `ApollonOptions`
})

// Read / write the model
console.log(editor.model)
editor.model = nextModel

// React to edits
const subscriptionId = editor.subscribeToModelChange((model) => {
  // persist / broadcast
})

// Export
const svg = await editor.exportAsSVG({ svgMode: "web" })

// Teardown
editor.unsubscribe(subscriptionId)
editor.destroy()
```

The editor is client-only. In SSR frameworks (Next.js, Remix, SvelteKit, Nuxt), construct it from a client-side effect — never during render. Always call `editor.destroy()` before re-mounting on the same container or unmounting the host element.

Type definitions ship with the package (`dist/index.d.ts`) and are identical for both subpaths. Requires TypeScript 5.0+ with `moduleResolution: "bundler" | "node16" | "nodenext"`.

Some public types reference `@xyflow/react` (`getNodes()`, `getEdges()`, `screenToFlowPosition()`, `flowToScreenPosition()`) and `react` (icon components on `DIAGRAM_NODE_DEFINITIONS`). TypeScript consumers of the **standalone** build either install `@xyflow/react` + `@types/react` as dev deps for those types to resolve, or set `skipLibCheck: true` in `tsconfig.json`. The `/react` subpath has them via peers.

## Embedding examples

### React

```tsx
"use client"
import { useEffect, useRef } from "react"
import {
  ApollonEditor,
  ApollonMode,
  Locale,
  UMLDiagramType,
} from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"

export function DiagramEditor() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<ApollonEditor | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    editorRef.current = new ApollonEditor(containerRef.current, {
      type: UMLDiagramType.ClassDiagram,
      mode: ApollonMode.Modelling,
      locale: Locale.en,
    })

    return () => {
      editorRef.current?.destroy()
      editorRef.current = null
    }
  }, [])

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
}
```

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

### Vanilla JS

```html
<link rel="stylesheet" href="https://unpkg.com/@tumaet/apollon/style.css" />
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

`ClassDiagram`, `ObjectDiagram`, `ActivityDiagram`, `UseCaseDiagram`, `CommunicationDiagram`, `ComponentDiagram`, `DeploymentDiagram`, `PetriNet`, `ReachabilityGraph`, `SyntaxTree`, `Flowchart`, `BPMN`, `Sfc` (Sequential Function Chart).

## Real-time collaboration

Collaboration is opt-in and transport-agnostic. Enable `collaborationEnabled` in `ApollonOptions`, then wire your transport to the editor's Yjs bridge:

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
- The standalone web editor, server, and VS Code extension live in the same monorepo.
- Developed alongside [Artemis](https://artemis.tum.de/), TUM's interactive learning platform.

## License

MIT — see [LICENSE](https://github.com/ls1intum/Apollon/blob/main/LICENSE).
