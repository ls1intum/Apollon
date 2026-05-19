# @tumaet/apollon

[![npm version](https://img.shields.io/npm/v/@tumaet/apollon)](https://www.npmjs.com/package/@tumaet/apollon)
[![npm license](https://img.shields.io/npm/l/@tumaet/apollon)](https://github.com/ls1intum/Apollon/blob/main/LICENSE)

Embeddable UML modeling editor. Renders a React tree into a DOM node you control. The public API is imperative (`new ApollonEditor(container, options)`), so your host code does not have to use React — but the library does, and you install React as a peer.

## Install

```sh
npm install @tumaet/apollon \
  react react-dom \
  @emotion/react @emotion/styled @mui/material @xyflow/react
```

Peer ranges: `react ^18.3 || ^19`, `react-dom ^18.3 || ^19`, `@mui/material ^6.4`, `@emotion/react ^11.11`, `@emotion/styled ^11.11`, `@xyflow/react ^12.3`.

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

Client-only. In SSR frameworks (Next.js, Remix, SvelteKit, Nuxt), construct from a client-side effect. Always `editor.destroy()` before unmounting the container.

Requires TypeScript 5.0+ with `moduleResolution: "bundler" | "node16" | "nodenext"`.

## Real-time collaboration

Opt-in and transport-agnostic. Set `collaborationEnabled: true`, then wire your transport:

```ts
editor.sendBroadcastMessage((base64) => transport.send(base64))
transport.onMessage((base64) => editor.receiveBroadcastedMessage(base64))
```

Any Yjs-compatible transport works (WebSocket, WebRTC, `y-websocket`, etc.).

## Export

- `editor.exportAsSVG(options)` → `{ svg, clip }`
- `editor.model` returns the `UMLModel` as JSON
- PNG / PDF use the same pipeline via `ExportOptions` (`svgMode: "web" | "compat"`); see `dist/index.d.ts`

## Related

- Source: <https://github.com/ls1intum/Apollon>
- Standalone editor, server, and VS Code extension live in the same monorepo
- Developed alongside [Artemis](https://artemis.tum.de/)

## License

MIT — see [LICENSE](https://github.com/ls1intum/Apollon/blob/main/LICENSE).
