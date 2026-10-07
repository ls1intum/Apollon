import { describe, it, expect } from "vitest"
import * as Y from "yjs"
import {
  clearModelFromYDoc,
  hasModelInYDoc,
  readModelFromYDoc,
  writeModelToYDoc,
} from "@/model"
import type { UMLModel } from "@/typings"

const model = (): UMLModel => ({
  version: "4.2.0",
  id: "diagram-1",
  title: "Orders",
  type: "ClassDiagram" as UMLModel["type"],
  nodes: [
    {
      id: "b-child",
      type: "class",
      width: 100,
      height: 50,
      position: { x: 10, y: 10 },
      parentId: "z-package",
      data: { name: "Order" },
      measured: { width: 100, height: 50 },
    },
    {
      id: "z-package",
      type: "package",
      width: 400,
      height: 300,
      position: { x: 0, y: 0 },
      data: { name: "shop" },
      measured: { width: 400, height: 300 },
    },
    {
      id: "a-class",
      type: "class",
      width: 100,
      height: 50,
      position: { x: 500, y: 0 },
      data: { name: "Customer" },
      measured: { width: 100, height: 50 },
    },
  ] as UMLModel["nodes"],
  edges: [
    {
      id: "edge-1",
      source: "a-class",
      target: "b-child",
      type: "ClassBidirectional",
      sourceHandle: "right",
      targetHandle: "left",
      data: { points: [] },
    },
  ] as UMLModel["edges"],
  assessments: {},
})

describe("model and Y.Doc helpers", () => {
  it("reports no model for a fresh document", () => {
    const ydoc = new Y.Doc()
    expect(hasModelInYDoc(ydoc)).toBe(false)
    expect(readModelFromYDoc(ydoc)).toBeNull()
  })

  it("reads back what was written, including id and interactive", () => {
    const ydoc = new Y.Doc()
    const written = {
      ...model(),
      interactive: { elements: { "a-class": true }, relationships: {} },
    }
    writeModelToYDoc(ydoc, written)

    const read = readModelFromYDoc(ydoc)!
    expect(hasModelInYDoc(ydoc)).toBe(true)
    expect(read.id).toBe("diagram-1")
    expect(read.title).toBe("Orders")
    expect(read.type).toBe("ClassDiagram")
    expect(read.interactive).toEqual(written.interactive)
    expect(read.edges).toEqual(written.edges)
    expect(read.nodes.map((node) => node.id)).toEqual([
      "a-class",
      "z-package",
      "b-child",
    ])
    expect(read.nodes.find((node) => node.id === "b-child")).toEqual(
      written.nodes[0]
    )
  })

  it("treats an empty diagram of a chosen type as a model", () => {
    const ydoc = new Y.Doc()
    writeModelToYDoc(ydoc, { ...model(), nodes: [], edges: [] })
    expect(hasModelInYDoc(ydoc)).toBe(true)
    expect(readModelFromYDoc(ydoc)!.nodes).toEqual([])
  })

  it("does not mutate the model it is given", () => {
    const input = model()
    const snapshot = structuredClone(input)
    writeModelToYDoc(new Y.Doc(), input)
    expect(input).toEqual(snapshot)
  })

  it("reads the same model on a peer that received the updates in another order", () => {
    const a = new Y.Doc()
    const updates: Uint8Array[] = []
    a.on("update", (update: Uint8Array) => updates.push(update))
    const base = model()
    writeModelToYDoc(a, { ...base, nodes: [base.nodes[2]], edges: [] })
    writeModelToYDoc(a, base)

    const b = new Y.Doc()
    for (const update of [...updates].reverse()) Y.applyUpdate(b, update)

    expect(readModelFromYDoc(b)).toEqual(readModelFromYDoc(a))
  })

  it("syncs an edit made to a model that was read from the document", () => {
    const ydoc = new Y.Doc()
    const peer = new Y.Doc()
    ydoc.on("update", (update: Uint8Array) => Y.applyUpdate(peer, update))
    writeModelToYDoc(ydoc, model())

    const edited = readModelFromYDoc(ydoc)!
    const node = edited.nodes.find((n) => n.id === "a-class")!
    ;(node.data as { name: string }).name = "Changed"

    const untouched = readModelFromYDoc(ydoc)!.nodes.find(
      (n) => n.id === "a-class"
    )!
    expect((untouched.data as { name: string }).name).toBe("Customer")

    writeModelToYDoc(ydoc, edited)

    const synced = readModelFromYDoc(peer)!.nodes.find(
      (n) => n.id === "a-class"
    )!
    expect((synced.data as { name: string }).name).toBe("Changed")
  })

  it("replaces a previous diagram instead of merging into it", () => {
    const ydoc = new Y.Doc()
    writeModelToYDoc(ydoc, model())
    writeModelToYDoc(ydoc, { ...model(), nodes: [], edges: [], title: "New" })
    const read = readModelFromYDoc(ydoc)!
    expect(read.nodes).toEqual([])
    expect(read.edges).toEqual([])
    expect(read.title).toBe("New")
  })

  it("clears the diagram and leaves foreign shared types alone", () => {
    const ydoc = new Y.Doc()
    ydoc.getMap("_host_meta").set("etag", "abc")
    writeModelToYDoc(ydoc, model())

    clearModelFromYDoc(ydoc)

    expect(hasModelInYDoc(ydoc)).toBe(false)
    expect(readModelFromYDoc(ydoc)).toBeNull()
    expect(ydoc.getMap("_host_meta").get("etag")).toBe("abc")
  })

  it("writes in a single transaction with the given origin", () => {
    const ydoc = new Y.Doc()
    const origins: unknown[] = []
    ydoc.on("afterTransaction", (transaction: Y.Transaction) =>
      origins.push(transaction.origin)
    )
    writeModelToYDoc(ydoc, model(), "host")
    expect(origins).toEqual(["host"])
  })
})
