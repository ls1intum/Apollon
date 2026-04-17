# @tumaet/apollon

[![npm version](https://img.shields.io/npm/v/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![npm license](https://img.shields.io/npm/l/@tumaet/apollon)](https://github.com/ls1intum/Apollon/blob/main/LICENSE)

A UML modeling editor for React. Mount it into any DOM node. 13 diagram types, SVG/PNG/PDF/JSON export, optional real-time collaboration via Yjs.

## Install

```sh
npm install @tumaet/apollon
```

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

The editor mounts into the DOM and is client-only. In SSR frameworks (Next.js, Remix), instantiate inside `useEffect` or behind a dynamic import. Call `editor.destroy()` before re-mounting on the same container.

Type definitions ship with the package (`dist/index.d.ts`).

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

- `editor.exportAsSVG(options)` resolves to `{ svg, clip }` — render or serialize as-is.
- PNG and PDF use the same pipeline via `ExportOptions` (`svgMode: "web" | "compat"`); see `dist/index.d.ts`.
- `editor.model` returns the `UMLModel` as JSON.

## Related

- Source and issue tracker: <https://github.com/ls1intum/Apollon>
- Standalone web editor, server, and mobile apps live in the same monorepo.
- Developed alongside [Artemis](https://artemis.tum.de/), TUM's interactive learning platform.

## License

MIT — see [LICENSE](https://github.com/ls1intum/Apollon/blob/main/LICENSE).
