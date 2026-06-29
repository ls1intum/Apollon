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

## Backing transports

Any Yjs-compatible transport works. The standalone server uses a custom WebSocket relay (see [`standalone/server/src/ws.ts`](https://github.com/ls1intum/Apollon/blob/main/standalone/server/src/ws.ts)); other deployments commonly use:

- [`y-websocket`](https://github.com/yjs/y-websocket) for self-hosted WebSocket relays
- [`y-webrtc`](https://github.com/yjs/y-webrtc) for peer-to-peer
- [`y-indexeddb`](https://github.com/yjs/y-indexeddb) for offline persistence (layered alongside any other transport)
- Any HTTP/3 stream or BroadcastChannel if your room is browser-local

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
