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

Any Yjs-compatible transport works. The standalone server uses a custom WebSocket relay (see [`standalone/server/src/ws.ts`](https://github.com/ls1intum/Apollon/blob/main/standalone/server/src/ws.ts)); other deployments commonly use:

- [`y-websocket`](https://github.com/yjs/y-websocket) for self-hosted WebSocket relays
- [`y-webrtc`](https://github.com/yjs/y-webrtc) for peer-to-peer
- [`y-indexeddb`](https://github.com/yjs/y-indexeddb) for offline persistence (layered alongside any other transport)
- Any HTTP/3 stream or BroadcastChannel if your room is browser-local

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
