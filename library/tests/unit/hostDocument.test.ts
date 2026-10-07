import { describe, it, expect } from "vitest"
import * as Y from "yjs"
import { Awareness } from "y-protocols/awareness"
import { createDiagramStore } from "@/store/diagramStore"
import { createMetadataStore } from "@/store/metadataStore"
import { YjsSync } from "@/sync/yjsSync"
import { readModelFromYDoc, writeModelToYDoc } from "@/model"
import type { UMLModel } from "@/typings"
import type { Node } from "@xyflow/react"

const classNode = (id: string, x = 0): Node => ({
  id,
  type: "class",
  width: 200,
  height: 100,
  position: { x, y: 0 },
  data: { name: `Class ${id}` },
})

const model = (nodes: Node[]): UMLModel =>
  ({
    version: "4.2.0",
    id: "diagram-1",
    title: "Shared",
    type: "ClassDiagram",
    nodes,
    edges: [],
    assessments: {},
  }) as unknown as UMLModel

// A peer as the editor builds it on a host-owned document: stores and sync on
// the host's doc and awareness, nothing owned.
const attach = (ydoc: Y.Doc, awareness: Awareness) => {
  const diagramStore = createDiagramStore(ydoc)
  const metadataStore = createMetadataStore(
    ydoc,
    () => diagramStore.getState().previewMode
  )
  const sync = new YjsSync(ydoc, diagramStore, metadataStore, awareness)
  diagramStore.getState().setCollaborationEnabled(true)
  diagramStore.getState().initializeUndoManager()
  return { diagramStore, metadataStore, sync }
}

// Stands in for the host's provider: relays document updates between two docs
// under an origin of its own.
const connect = (a: Y.Doc, b: Y.Doc) => {
  const provider = { name: "provider" }
  a.on("update", (update: Uint8Array, origin: unknown) => {
    if (origin !== provider) Y.applyUpdate(b, update, provider)
  })
  b.on("update", (update: Uint8Array, origin: unknown) => {
    if (origin !== provider) Y.applyUpdate(a, update, provider)
  })
}

describe("editor stores on a host-owned document", () => {
  it("a change applied by the host's provider reaches the store", () => {
    const docA = new Y.Doc()
    const docB = new Y.Doc()
    connect(docA, docB)
    const a = attach(docA, new Awareness(docA))
    const b = attach(docB, new Awareness(docB))

    a.diagramStore.getState().setNodes([classNode("n1")])

    expect(b.diagramStore.getState().nodes.map((n) => n.id)).toEqual(["n1"])
  })

  it("a host write is rendered but is not on the user's undo stack", () => {
    const ydoc = new Y.Doc()
    const peer = attach(ydoc, new Awareness(ydoc))

    writeModelToYDoc(ydoc, model([classNode("seeded")]))

    expect(peer.diagramStore.getState().nodes.map((n) => n.id)).toEqual([
      "seeded",
    ])
    expect(peer.metadataStore.getState().diagramTitle).toBe("Shared")
    expect(peer.diagramStore.getState().undoManager!.canUndo()).toBe(false)
  })

  it("undo reverts only the local user's edit", () => {
    const docA = new Y.Doc()
    const docB = new Y.Doc()
    connect(docA, docB)
    writeModelToYDoc(docA, model([]))
    const a = attach(docA, new Awareness(docA))
    const b = attach(docB, new Awareness(docB))

    a.diagramStore.getState().setNodes([classNode("from-a")])
    b.diagramStore
      .getState()
      .setNodes((nodes) => [...nodes, classNode("from-b", 300)])
    b.diagramStore.getState().undo()

    const ids = readModelFromYDoc(docA)!.nodes.map((n) => n.id)
    expect(ids).toEqual(["from-a"])
  })

  it("releasing a host awareness clears the editor's fields and keeps the user", () => {
    const ydoc = new Y.Doc()
    const awareness = new Awareness(ydoc)
    const user = { id: "u1", name: "Ada", color: "#ff0000" }
    awareness.setLocalStateField("user", user)
    const peer = attach(ydoc, awareness)
    peer.sync.setLocalAwarenessCursor({ x: 1, y: 2 })
    peer.sync.setLocalAwarenessSelectedElement("n1")

    peer.sync.stopSync()
    peer.sync.releaseAwareness()

    expect(awareness.getLocalState()).toMatchObject({
      user,
      cursor: null,
      selectedElementId: null,
    })
    awareness.destroy()
  })

  it("releasing an awareness the sync created itself destroys it", () => {
    const ydoc = new Y.Doc()
    const diagramStore = createDiagramStore(ydoc)
    const metadataStore = createMetadataStore(ydoc)
    const sync = new YjsSync(ydoc, diagramStore, metadataStore)
    sync.setLocalAwarenessCursor({ x: 1, y: 2 })

    sync.stopSync()
    sync.releaseAwareness()

    expect(sync.getAwarenessStates().size).toBe(0)
  })

  it("a destroyed undo manager stops capturing writes on the surviving document", () => {
    const ydoc = new Y.Doc()
    const peer = attach(ydoc, new Awareness(ydoc))
    const undoManager = peer.diagramStore.getState().undoManager!

    undoManager.destroy()
    ydoc.transact(
      () => ydoc.getMap("nodes").set("late", classNode("late")),
      "store"
    )

    expect(undoManager.undoStack.length).toBe(0)
  })
})
