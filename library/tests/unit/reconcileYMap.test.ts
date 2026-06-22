import { describe, it, expect } from "vitest"
import * as Y from "yjs"
import { createDiagramStore } from "@/store/diagramStore"
import { getNodesMap, reconcileYMap } from "@/sync/ydoc"
import type { Node } from "@xyflow/react"

const makeNode = (id: string, name: string): Node => ({
  id,
  type: "class",
  position: { x: 0, y: 0 },
  data: { name },
})

// Count writes (set + delete) against a Y.Map by spying on the live instance.
function spyMapOps(map: Y.Map<unknown>) {
  const counts = { set: 0, delete: 0 }
  const origSet = map.set.bind(map)
  const origDelete = map.delete.bind(map)
  map.set = ((k: string, v: unknown) => {
    counts.set++
    return origSet(k, v)
  }) as typeof map.set
  map.delete = ((k: string) => {
    counts.delete++
    return origDelete(k)
  }) as typeof map.delete
  return counts
}

describe("reconcileYMap", () => {
  it("deletes removed keys and leaves unchanged keys untouched (no new struct)", () => {
    const doc = new Y.Doc()
    const map = doc.getMap<{ v: number }>("m")
    doc.transact(() => {
      map.set("a", { v: 1 })
      map.set("b", { v: 2 })
      map.set("c", { v: 3 })
    })

    const aItem = map.get("a")

    const counts = spyMapOps(map)
    doc.transact(() => {
      reconcileYMap(map, [
        ["a", { v: 1 }], // unchanged
        ["b", { v: 99 }], // changed
        // "c" removed
      ])
    })

    // c deleted; b re-set; a untouched.
    expect(counts.delete).toBe(1)
    expect(counts.set).toBe(1)
    expect(map.has("c")).toBe(false)
    expect(map.get("b")).toEqual({ v: 99 })
    // Unchanged key keeps its identity (no rewrite).
    expect(map.get("a")).toBe(aItem)

    doc.destroy()
  })

  it("re-writes a node whose parentId clears (parentId 'parent' -> undefined)", () => {
    // Dragging a node out of its parent flips parentId from a string to
    // undefined. reconcile must persist that as a real write — value inequality
    // ("parent" !== undefined) drives it — or the node stays nested in Yjs.
    const doc = new Y.Doc()
    const map = getNodesMap(doc)
    const child = makeNode("child", "Child")
    doc.transact(() => {
      map.set("child", { ...child, parentId: "parent" })
    })
    expect(map.get("child")?.parentId).toBe("parent")

    const counts = spyMapOps(map)
    doc.transact(() => {
      reconcileYMap(map, [["child", { ...child, parentId: undefined }]])
    })

    expect(counts.set).toBe(1)
    expect(map.get("child")?.parentId).toBeUndefined()
    doc.destroy()
  })
})

describe("diagramStore persistence diffing", () => {
  it("editing a label on an N=30 diagram produces < 2N node map ops", () => {
    const N = 30
    const doc = new Y.Doc()
    const store = createDiagramStore(doc)
    const nodes = Array.from({ length: N }, (_, i) =>
      makeNode(`n${i}`, `Class ${i}`)
    )
    store.getState().setNodes(nodes)

    const counts = spyMapOps(getNodesMap(doc))

    // Simulate one keystroke: rename a single node, replace the array.
    const next = store
      .getState()
      .nodes.map((node) =>
        node.id === "n0"
          ? { ...node, data: { ...node.data, name: "Renamed" } }
          : node
      )
    store.getState().setNodes(next)

    // Exactly one node changed, so exactly one map op — not the ~2N
    // (clear + set-all) that the old writer produced.
    const totalOps = counts.set + counts.delete
    expect(totalOps).toBe(1)
    doc.destroy()
  })

  it("toggling node `selected` produces ZERO Yjs node writes", () => {
    const doc = new Y.Doc()
    const store = createDiagramStore(doc)
    const nodes = [makeNode("a", "A"), makeNode("b", "B")]
    store.getState().setNodes(nodes)

    const counts = spyMapOps(getNodesMap(doc))

    const selected = store
      .getState()
      .nodes.map((node) =>
        node.id === "a" ? { ...node, selected: true } : node
      )
    store.getState().setNodes(selected)

    expect(counts.set).toBe(0)
    expect(counts.delete).toBe(0)
    doc.destroy()
  })
})
