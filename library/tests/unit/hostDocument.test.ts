import { afterEach, describe, it, expect } from "vitest"
import * as Y from "yjs"
import { Awareness } from "y-protocols/awareness"
import { createDiagramStore } from "@/store/diagramStore"
import { createMetadataStore } from "@/store/metadataStore"
import { YjsSync } from "@/sync/yjsSync"
import { readModelFromYDoc, writeModelToYDoc } from "@/model"
import type { UMLModel } from "@/typings"
import type { Node } from "@xyflow/react"

const documents: Y.Doc[] = []
const createDoc = () => {
  const doc = new Y.Doc()
  documents.push(doc)
  return doc
}

afterEach(() => {
  for (const doc of documents.splice(0)) doc.destroy()
})

const classNode = (id: string, x = 0): Node => ({
  id,
  type: "class",
  width: 200,
  height: 100,
  measured: { width: 200, height: 100 },
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
    const docA = createDoc()
    const docB = createDoc()
    connect(docA, docB)
    const a = attach(docA, new Awareness(docA))
    const b = attach(docB, new Awareness(docB))

    a.diagramStore.getState().setNodes([classNode("n1")])

    expect(b.diagramStore.getState().nodes.map((n) => n.id)).toEqual(["n1"])
  })

  it("a host write is rendered but is not on the user's undo stack", () => {
    const ydoc = createDoc()
    const peer = attach(ydoc, new Awareness(ydoc))

    writeModelToYDoc(ydoc, model([classNode("seeded")]))

    expect(peer.diagramStore.getState().nodes.map((n) => n.id)).toEqual([
      "seeded",
    ])
    expect(peer.metadataStore.getState().diagramTitle).toBe("Shared")
    expect(peer.diagramStore.getState().undoManager!.canUndo()).toBe(false)
  })

  it("keeps display geometry local until an explicit persistent update", () => {
    const ydoc = createDoc()
    const peer = attach(ydoc, new Awareness(ydoc))
    writeModelToYDoc(ydoc, model([classNode("a")]))

    peer.diagramStore
      .getState()
      .setNodes((nodes) => nodes.map((node) => ({ ...node, width: 300 })), {
        persist: false,
      })

    peer.diagramStore.getState().onNodesChange(
      [
        {
          id: "a",
          type: "dimensions",
          dimensions: { width: 300, height: 100 },
        },
      ],
      { persist: false }
    )
    expect(peer.diagramStore.getState().nodes[0].measured!.width).toBe(300)
    expect(readModelFromYDoc(ydoc)!.nodes[0].measured.width).toBe(200)
    expect(peer.diagramStore.getState().nodes[0].width).toBe(300)
    expect(readModelFromYDoc(ydoc)!.nodes[0].width).toBe(200)
    expect(peer.diagramStore.getState().undoManager!.canUndo()).toBe(false)

    peer.diagramStore.getState().setNodes(peer.diagramStore.getState().nodes)

    expect(readModelFromYDoc(ydoc)!.nodes[0].width).toBe(300)
    expect(peer.diagramStore.getState().undoManager!.canUndo()).toBe(true)
  })

  it("keeps manual route reprojection local until an identical persistent update", () => {
    const ydoc = createDoc()
    const peer = attach(ydoc, new Awareness(ydoc))
    const points = [
      { x: 200, y: 50 },
      { x: 250, y: 50 },
      { x: 250, y: 150 },
      { x: 600, y: 150 },
    ]
    writeModelToYDoc(ydoc, {
      ...model([classNode("a"), classNode("b", 600)]),
      edges: [
        {
          id: "edge",
          source: "a",
          target: "b",
          type: "ClassBidirectional",
          sourceHandle: "right",
          targetHandle: "left",
          data: { points },
        },
      ],
    })
    const reprojected = points.map((point) => ({ ...point, y: point.y + 20 }))

    peer.diagramStore.getState().setEdges(
      (edges) =>
        edges.map((edge) => ({
          ...edge,
          data: { ...edge.data, points: reprojected },
        })),
      { persist: false }
    )

    expect(peer.diagramStore.getState().edges[0].data!.points).toEqual(
      reprojected
    )
    expect(readModelFromYDoc(ydoc)!.edges[0].data.points).toEqual(points)
    expect(peer.diagramStore.getState().undoManager!.canUndo()).toBe(false)

    peer.diagramStore.getState().setEdges(peer.diagramStore.getState().edges)

    expect(readModelFromYDoc(ydoc)!.edges[0].data.points).toEqual(reprojected)
    expect(peer.diagramStore.getState().undoManager!.canUndo()).toBe(true)
  })

  it("undo reverts only the local user's edit", () => {
    const docA = createDoc()
    const docB = createDoc()
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
    const ydoc = createDoc()
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
    const ydoc = createDoc()
    const diagramStore = createDiagramStore(ydoc)
    const metadataStore = createMetadataStore(ydoc)
    const sync = new YjsSync(ydoc, diagramStore, metadataStore)
    sync.setLocalAwarenessCursor({ x: 1, y: 2 })

    sync.stopSync()
    sync.releaseAwareness()

    expect(sync.getAwarenessStates().size).toBe(0)
  })

  it("a destroyed undo manager stops capturing writes on the surviving document", () => {
    const ydoc = createDoc()
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
