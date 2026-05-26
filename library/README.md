# @tumaet/apollon

[![npm version](https://img.shields.io/npm/v/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![npm license](https://img.shields.io/npm/l/@tumaet/apollon)](https://github.com/ls1intum/Apollon/blob/main/LICENSE)

Embeddable UML modeling editor. Mounts into any DOM node — works inside Angular, Vue, Svelte, vanilla JS, or React hosts. 13 diagram types, SVG/PNG/PDF/JSON export, optional real-time collaboration via Yjs.

## Install

The package ships two builds with identical APIs:

| Subpath                       | React / MUI / emotion / xyflow | Bundle  | Use when                                                                                          |
| ----------------------------- | ------------------------------ | ------- | ------------------------------------------------------------------------------------------------- |
| `@tumaet/apollon` _(default)_ | bundled                        | ~2.4 MB | Your host is Angular, Vue, Svelte, vanilla JS, or any framework that doesn't already have React.  |
| `@tumaet/apollon/react`       | externalized (peer deps)       | ~875 KB | Your host is React 18.3 and you want the editor to share React with your app instead of bundling. |

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
import { Apollon } from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"
```

Peer ranges: `react ^18.3`, `react-dom ^18.3`, `@mui/material ^6.4`, `@emotion/react ^11.11`, `@emotion/styled ^11.11`, `@xyflow/react ^12.3`. The `/react` subpath keeps your final bundle from shipping a second copy of React, and is the only entry that exports the `<Apollon>` React component.

## Usage

```ts
import { ApollonEditor, UMLDiagramType } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

const container = document.getElementById("apollon")
if (!container) throw new Error("#apollon container missing")

const editor = new ApollonEditor(container, {
  type: UMLDiagramType.ClassDiagram,
})

const subscriptionId = editor.subscribeToModelChange((model) => {
  // persist / broadcast
})

const svg = await editor.exportAsSVG({ svgMode: "web" })

editor.unsubscribe(subscriptionId)
editor.destroy()
```

The editor is client-only. In SSR frameworks (Next.js, Remix, SvelteKit, Nuxt), construct from a client-side effect — never during render. Always call `editor.destroy()` before re-mounting on the same container.

## Embedding examples

### React

Use the `<Apollon>` component from the `@tumaet/apollon/react` subpath. Render a saved diagram and persist edits as the user makes them:

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

The component owns the editor's lifecycle. See the [React embedding guide](https://ls1intum.github.io/Apollon/library/embedding/react) for hooks, ref, and provider.

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

Pin an exact version; an unpinned CDN URL resolves to `latest` and can break your embed on the next page refresh.

## Supported diagrams

Class, Object, Activity, Use Case, Communication, Component, Deployment, Petri Net, Reachability Graph, Syntax Tree, Flowchart, BPMN, SFC. See `UMLDiagramType` in `dist/index.d.ts` for the exact enum.

## Real-time collaboration

Opt-in and transport-agnostic. Set `collaborationEnabled: true`, then wire your transport:

```ts
editor.sendBroadcastMessage((base64) => transport.send(base64))
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
