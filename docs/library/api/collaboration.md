---
id: collaboration
title: Real-time collaboration
description: Yjs-based multi-user editing — transport-agnostic, opt-in.
---

# Real-time collaboration

Apollon's collaboration layer is built on [Yjs](https://yjs.dev/). Set `collaborationEnabled: true` in the constructor options, then wire your transport. The editor doesn't care whether messages travel over WebSocket, WebRTC, BroadcastChannel, or anything else — it hands you opaque base64 strings to ship and accepts them back.

```ts no-check
const editor = new ApollonEditor(container, {
  type: UMLDiagramType.ClassDiagram,
  collaborationEnabled: true,
})

// Outbound: the editor calls your callback when it has bytes to send.
editor.sendBroadcastMessage((base64) => transport.send(base64))

// Inbound: forward every received frame back to the editor.
transport.onMessage((base64) => editor.receiveBroadcastedMessage(base64))
```

## A complete transport (BroadcastChannel)

A full, working transport using the browser's `BroadcastChannel` — two tabs of
the same origin edit one diagram live. Swap `BroadcastChannel` for your
WebSocket/WebRTC channel; the editor calls are identical.

```ts
import { ApollonEditor } from "@tumaet/apollon"

export function connectCollaboration(editor: ApollonEditor, room = "apollon") {
  const channel = new BroadcastChannel(room)

  // Register the outbound sink before anything else — broadcasts are no-ops until set.
  editor.sendBroadcastMessage((base64) => channel.postMessage(base64))

  // Forward every inbound frame to the editor; it demuxes by message type.
  channel.onmessage = (e: MessageEvent<string>) =>
    editor.receiveBroadcastedMessage(e.data)

  // On (re)connect: pull peers' document + presence, then push our own.
  channel.postMessage(ApollonEditor.generateInitialSyncMessage())
  channel.postMessage(ApollonEditor.generateInitialAwarenessSyncMessage())
  editor.broadcastFullState()

  return () => channel.close()
}
```

## Who's online

`subscribeToCollaboratorChanges` fires with the current collaborators — each a
`CollaboratorInfo` (`{ id, name, color, imageUrl?, clientIds, isLocal }`):

```ts
import { ApollonEditor, type CollaboratorInfo } from "@tumaet/apollon"

function watchCollaborators(editor: ApollonEditor) {
  const subId = editor.subscribeToCollaboratorChanges(
    (collaborators: CollaboratorInfo[]) => {
      const remote = collaborators.filter((c) => !c.isLocal)
      console.log(`${remote.length} other editor(s) online`)
    }
  )
  return () => editor.unsubscribe(subId)
}
```

## Backing transports

Any Yjs-compatible transport works. With the frame API above you relay the editor's messages yourself; providers that work on a `Y.Doc` attach through [a host-owned document](#bring-your-own-ydoc-and-awareness). The standalone server uses a custom WebSocket relay (see [`standalone/server/src/ws.ts`](https://github.com/ls1intum/Apollon/blob/main/standalone/server/src/ws.ts)); other deployments commonly use:

- [`y-websocket`](https://github.com/yjs/y-websocket) for self-hosted WebSocket relays
- [`y-webrtc`](https://github.com/yjs/y-webrtc) for peer-to-peer
- [`y-indexeddb`](https://github.com/yjs/y-indexeddb) for offline persistence (layered alongside any other transport)
- Any HTTP/3 stream or BroadcastChannel if your room is browser-local

## Bring your own Y.Doc and awareness

The providers above, and hosts that already run a Yjs session of their own, work on a `Y.Doc` object rather than on relayed frames. Hand the editor that document, and optionally the awareness bound to it, through the `collaboration` option:

```ts no-check
import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"

const ydoc = new Y.Doc()
const provider = new WebsocketProvider(serverUrl, roomName, ydoc)

// Mount only once the document has its existing content.
provider.once("sync", () => {
  const editor = new ApollonEditor(container, {
    collaboration: {
      ydoc,
      awareness: provider.awareness,
    },
  })
})
```

The editor then keeps its diagram in your document and shows cursors, selections and presence from your awareness. You do not call `sendBroadcastMessage` or `receiveBroadcastedMessage`: the provider syncs the document, and the editor emits no frames unless a send function is registered.

Rules that apply to a host-owned document:

- **Mount after the document has loaded.** Construct the editor only after the provider's first sync, and after an asynchronous persistence provider such as y-indexeddb has finished loading. On a document that holds no diagram the constructor writes a title, a diagram type and an id. If the existing content arrives later, those writes compete with the stored values and can replace them.
- **The document is the source of truth.** If it already holds a diagram, the editor shows that diagram and the `model` option does not write to it. `model` only seeds a document that holds no diagram yet.
- **The editor never destroys what it did not create.** `destroy()` leaves your document and your awareness alive. It removes the fields the editor wrote to the awareness (`cursor`, `viewport`, `selectedElementId`, `followingClientId`, `draggingNodes`) and keeps `user`.
- **Destroy the editor before the document.** The editor's observers hold on to the document until `destroy()` runs.
- **Identity comes from your awareness.** Peers are shown from the `user` field (`{ name, color, id?, imageUrl? }`) of each awareness state. Set it yourself, or pass `collaboration.user` and the editor writes it for you.
- **Passing `awareness` enables collaboration** and its visuals by default; the `show*` toggles still apply. `awareness` requires `ydoc` and must be bound to it.
- **Do not use the transaction origin `"store"`** for your own writes to the document. The editor reserves it for local edits and ignores it when syncing its view.
- **Writes from [the model helpers](#reading-and-writing-a-ydoc-without-an-editor) count as remote changes.** A mounted editor renders them, and they never enter a user's undo history.
- Other shared types in the same document are left alone, so the host can keep its own data next to the diagram. The editor uses the top-level maps `nodes`, `edges`, `assessments` and `diagramMetadata`.

## Reading and writing a Y.Doc without an editor

A host sometimes has to turn a model into a Yjs document, or back, where no editor runs: when it loads a file into a shared document before the UI exists, when it saves, or on a server. The DOM-free entry point `@tumaet/apollon/model` converts between a model and a document in the layout the editor uses:

```ts no-check
import {
  importDiagram,
  writeModelToYDoc,
  readModelFromYDoc,
  hasModelInYDoc,
  clearModelFromYDoc,
} from "@tumaet/apollon/model"

// load: file content into the shared document
writeModelToYDoc(ydoc, importDiagram(JSON.parse(fileContent)))

// save: shared document back to file content
const model = readModelFromYDoc(ydoc) // null while the document holds no diagram
```

| Function                                 | Description                                                                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `writeModelToYDoc(ydoc, model, origin?)` | Writes a current model, replacing any diagram in the document. Synchronous, one transaction. Run untrusted input through `importDiagram` first. |
| `readModelFromYDoc(ydoc)`                | Returns the diagram as a `UMLModel`, or `null` if there is none. Elements are ordered by id, so every peer reads the same result.               |
| `hasModelInYDoc(ydoc)`                   | Whether the document holds a diagram. An empty diagram of a chosen type counts.                                                                 |
| `clearModelFromYDoc(ydoc, origin?)`      | Removes the diagram and leaves other shared types alone.                                                                                        |

The model `id` and `interactive` block are stored in the document as well, so a read after a write returns the same model. The writes run under the transaction origin `MODEL_DOC_ORIGIN` unless you pass your own `origin`.

## Awareness (cursors, selections, follow)

Awareness state — who's online, where their cursor is, what they have selected, and where their viewport sits — rides on the same channel as document updates. The editor manages awareness internally; you don't need to wire anything beyond `sendBroadcastMessage` / `receiveBroadcastedMessage`.

The presence bar, cursors, selection highlights, and viewport-following are toggled per-feature on the `collaboration` option:

```ts no-check
const editor = new ApollonEditor(container, {
  collaboration: {
    enabled: true,
    user: { name: "Ada", color: "#1c7ed6" },
    showPresence: true, // avatar bar (top-right)
    showCursors: true, // live remote cursors
    showSelectionHighlights: true, // highlight peers' selected elements
    showFollow: true, // click a peer's avatar to mirror their viewport
  },
})
```

When `showFollow` is on, clicking a collaborator's avatar follows their viewport. The follower sees the editor framed in that person's color and a banner naming them with a **Stop** button; the followed user sees a "followed by N" badge. Any local pan/zoom hands control back and stops following.

## Server-side integration

If you want to drive the wire protocol from a Node server (integration tests, headless conversion, replication), use the **unstable** `@tumaet/apollon/internals` subpath:

```ts
import {
  createHeadlessSync,
  MessageType,
  type YjsSync,
} from "@tumaet/apollon/internals"
```

`/internals` is explicitly **not** covered by SemVer. The standalone server's integration tests pin against it.
