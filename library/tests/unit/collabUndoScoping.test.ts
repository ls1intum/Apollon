import { describe, it, expect } from "vitest"
import * as Y from "yjs"
import { createDiagramStore } from "@/store/diagramStore"
import { createMetadataStore } from "@/store/metadataStore"
import { YjsSync } from "@/sync/yjsSync"
import { getNodesMap } from "@/sync/ydoc"
import type { Node } from "@xyflow/react"

// Two real peers, wired through the production sync path: each peer's
// `sendBroadcastMessage` is piped straight into the other's
// `handleReceivedData`, so local writes go out tagged "store"/undo-origin and
// arrive on the other peer applied as "remote" — exactly as over a websocket.
// This is the E2E of the PR's headline claim: undo is scoped per user.
//
// The relay is synchronous and loop-safe: a "remote"-origin apply is neither
// "store" nor an undo transaction, so the receiving peer never re-broadcasts.

const makeNode = (id: string, x: number): Node => ({
  id,
  type: "class",
  width: 200,
  height: 100,
  position: { x, y: 0 },
  data: { name: `Class ${id}` },
})

type Peer = ReturnType<typeof makePeer>

const makePeer = () => {
  const ydoc = new Y.Doc()
  const diagramStore = createDiagramStore(ydoc)
  const metadataStore = createMetadataStore(
    ydoc,
    () => diagramStore.getState().previewMode
  )
  const sync = new YjsSync(ydoc, diagramStore, metadataStore)
  diagramStore.getState().setCollaborationEnabled(true)
  return { ydoc, diagramStore, sync }
}

const wire = (a: Peer, b: Peer) => {
  a.sync.setSendBroadcastMessage((data) => b.sync.handleReceivedData(data))
  b.sync.setSendBroadcastMessage((data) => a.sync.handleReceivedData(data))
}

const nodeX = (peer: Peer, id: string) =>
  getNodesMap(peer.ydoc).get(id)?.position.x

const moveNode = (peer: Peer, id: string, x: number) => {
  peer.diagramStore
    .getState()
    .setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, position: { x, y: 0 } } : n))
    )
}

describe("collaborative undo is scoped to the local user", () => {
  it("a peer CANNOT undo a collaborator's edit (the user's concern)", () => {
    const A = makePeer()
    const B = makePeer()
    wire(A, B)

    // Shared baseline, then turn on undo on both — so the baseline is not in
    // anyone's undo stack and we measure only the gesture below.
    A.diagramStore.getState().setNodes([makeNode("a", 0), makeNode("b", 0)])
    A.diagramStore.getState().initializeUndoManager()
    B.diagramStore.getState().initializeUndoManager()
    expect(nodeX(B, "a")).toBe(0) // baseline reached B

    // A moves node "a". It reaches B as a "remote" edit.
    moveNode(A, "a", 100)
    expect(nodeX(A, "a")).toBe(100)
    expect(nodeX(B, "a")).toBe(100)

    // B has authored nothing, so B's stack is empty: B's Cmd+Z is a no-op and
    // can NOT revert A's move. This is the exact failure the user feared.
    expect(B.diagramStore.getState().undoManager!.canUndo()).toBe(false)
    B.diagramStore.getState().undo()
    expect(nodeX(A, "a")).toBe(100)
    expect(nodeX(B, "a")).toBe(100)
  })

  it("a peer CAN undo its own edit, and the revert propagates to the collaborator", () => {
    const A = makePeer()
    const B = makePeer()
    wire(A, B)
    A.diagramStore.getState().setNodes([makeNode("a", 0)])
    A.diagramStore.getState().initializeUndoManager()
    B.diagramStore.getState().initializeUndoManager()

    moveNode(A, "a", 100)
    expect(nodeX(B, "a")).toBe(100)

    // A undoes its own edit: a legitimate collaborative change everyone sees.
    A.diagramStore.getState().undo()
    expect(nodeX(A, "a")).toBe(0)
    expect(nodeX(B, "a")).toBe(0)
  })

  it("A's undo never overwrites an element the collaborator edited afterwards", () => {
    const A = makePeer()
    const B = makePeer()
    wire(A, B)
    A.diagramStore.getState().setNodes([makeNode("a", 0)])
    A.diagramStore.getState().initializeUndoManager()
    B.diagramStore.getState().initializeUndoManager()

    // A moves "a" to 100, then B moves the SAME node to 200 afterwards.
    moveNode(A, "a", 100)
    moveNode(B, "a", 200)
    expect(nodeX(A, "a")).toBe(200)
    expect(nodeX(B, "a")).toBe(200)

    // A undoes its own edit. Because a remote change (B's) landed on the same
    // key afterwards, the undo safely no-ops (ignoreRemoteMapChanges=false) —
    // it does NOT clobber B's value back to 0/100.
    A.diagramStore.getState().undo()
    expect(nodeX(A, "a")).toBe(200)
    expect(nodeX(B, "a")).toBe(200)

    // B can still undo ITS edit, reverting to A's value (100), not the origin.
    B.diagramStore.getState().undo()
    expect(nodeX(A, "a")).toBe(100)
    expect(nodeX(B, "a")).toBe(100)
  })

  it("each peer's stack holds only its own edits, interleaved", () => {
    const A = makePeer()
    const B = makePeer()
    wire(A, B)
    A.diagramStore.getState().setNodes([makeNode("a", 0), makeNode("b", 0)])
    A.diagramStore.getState().initializeUndoManager()
    B.diagramStore.getState().initializeUndoManager()

    moveNode(A, "a", 10) // A's edit
    moveNode(B, "b", 20) // B's edit (different node)
    expect(nodeX(A, "a")).toBe(10)
    expect(nodeX(B, "b")).toBe(20)

    // A's stack has only A's edit; B's only B's.
    const undoA = A.diagramStore.getState().undoManager!
    const undoB = B.diagramStore.getState().undoManager!
    expect(undoA.undoStack.length).toBe(1)
    expect(undoB.undoStack.length).toBe(1)

    // A undoes: only "a" reverts; B's "b" untouched on both peers.
    A.diagramStore.getState().undo()
    expect(nodeX(A, "a")).toBe(0)
    expect(nodeX(B, "a")).toBe(0)
    expect(nodeX(A, "b")).toBe(20)
    expect(nodeX(B, "b")).toBe(20)

    // B undoes: only "b" reverts.
    B.diagramStore.getState().undo()
    expect(nodeX(A, "b")).toBe(0)
    expect(nodeX(B, "b")).toBe(0)
  })
})
