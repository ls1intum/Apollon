import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import * as Y from "yjs"
import { ApollonEditor } from "@/apollon-editor"
import { createDiagramStore } from "@/store/diagramStore"
import { getPerfCounters } from "@/sync/perfCounters"
import { getNodesMap, STORE_ORIGIN } from "@/sync/ydoc"
import { UMLDiagramType } from "@/types"
import type { UMLModel } from "@/typings"

const makeNode = (id: string, x: number) => ({
  id,
  type: "class" as const,
  width: 200,
  height: 100,
  position: { x, y: 0 },
  measured: { width: 200, height: 100 },
  data: { name: `Class ${id}` },
})

const makeModel = (nodeCount: number): UMLModel => ({
  id: "perf-probe-model",
  version: "4.0.0",
  title: "Perf Probe",
  type: UMLDiagramType.ClassDiagram,
  nodes: Array.from({ length: nodeCount }, (_, i) =>
    makeNode(`n${i}`, i * 250)
  ),
  edges: [],
  assessments: {},
})

describe("ApollonEditor.__perf()", () => {
  let container: HTMLElement
  let editor: ApollonEditor

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    editor = new ApollonEditor(container)
  })

  afterEach(() => {
    editor.destroy()
    container.remove()
  })

  it("returns an object with numeric fields that reflect document growth", () => {
    const baseline = editor.__perf()
    expect(baseline).toBeDefined()
    if (!baseline) throw new Error("expected __perf() to be defined under DEV")

    for (const value of Object.values(baseline)) {
      expect(typeof value).toBe("number")
    }
    expect(baseline.nodesMapSize).toBe(0)

    editor.model = makeModel(2)
    editor.model = makeModel(4)

    const after = editor.__perf()
    if (!after) throw new Error("expected __perf() to be defined under DEV")

    expect(after.nodesMapSize).toBe(4)
    expect(after.encodedDocBytes).toBeGreaterThan(baseline.encodedDocBytes)
    expect(after.structCount).toBeGreaterThan(baseline.structCount)
    expect(after.undoStackDepth).toBeGreaterThanOrEqual(0)
  })

  it("returns undefined in production (the build-time dead-code stub contract)", () => {
    vi.stubEnv("DEV", false)
    try {
      expect(editor.__perf()).toBeUndefined()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it("counts a committed onNodesChange node write via storeNodeWrites", () => {
    const ydoc = new Y.Doc()
    const store = createDiagramStore(ydoc)
    store.getState().setNodes([makeNode("a", 0)])

    const before = getPerfCounters()?.storeNodeWrites ?? 0

    store.getState().onNodesChange([
      {
        id: "a",
        type: "position",
        position: { x: 999, y: 0 },
        dragging: false,
      },
    ])

    const after = getPerfCounters()?.storeNodeWrites ?? 0
    expect(after).toBe(before + 1)

    ydoc.destroy()
  })

  it("does not write transient drag frames to Yjs, only the settle frame", () => {
    const ydoc = new Y.Doc()
    const store = createDiagramStore(ydoc)
    store.getState().setNodes([makeNode("a", 0)])

    const before = getPerfCounters()?.storeNodeWrites ?? 0

    for (let i = 1; i <= 60; i++) {
      store.getState().onNodesChange([
        {
          id: "a",
          type: "position",
          position: { x: i, y: 0 },
          dragging: true,
        },
      ])
    }
    expect((getPerfCounters()?.storeNodeWrites ?? 0) - before).toBe(0)

    store.getState().onNodesChange([
      {
        id: "a",
        type: "position",
        position: { x: 61, y: 0 },
        dragging: false,
      },
    ])

    expect((getPerfCounters()?.storeNodeWrites ?? 0) - before).toBe(1)

    expect(store.getState().nodes[0].position.x).toBe(61)
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(61)

    ydoc.destroy()
  })

  it("keeps Yjs document growth bounded across a long drag with the undo manager active", () => {
    const ydoc = new Y.Doc()
    const store = createDiagramStore(ydoc)
    store.getState().setNodes([makeNode("a", 0)])
    // An active UndoManager pins every tracked struct, defeating Yjs GC: this
    // is the single-user (exam) configuration where transient drag writes
    // ballooned the document.
    store.getState().initializeUndoManager()

    const baseBytes = Y.encodeStateAsUpdate(ydoc).byteLength

    for (let i = 1; i <= 200; i++) {
      store.getState().onNodesChange([
        {
          id: "a",
          type: "position",
          position: { x: i, y: 0 },
          dragging: true,
        },
      ])
    }
    store.getState().onNodesChange([
      {
        id: "a",
        type: "position",
        position: { x: 201, y: 0 },
        dragging: false,
      },
    ])

    const afterBytes = Y.encodeStateAsUpdate(ydoc).byteLength

    // The 200 transient frames must not be persisted; only the single settle
    // write grows the doc, so growth stays tiny instead of ~200x.
    expect(afterBytes - baseBytes).toBeLessThan(200)

    ydoc.destroy()
  })

  it("does not write transient resize frames to Yjs, only the settle frame", () => {
    const ydoc = new Y.Doc()
    const store = createDiagramStore(ydoc)
    store.getState().setNodes([makeNode("a", 0)])

    const before = getPerfCounters()?.storeNodeWrites ?? 0

    for (let i = 1; i <= 30; i++) {
      store.getState().onNodesChange([
        {
          id: "a",
          type: "dimensions",
          dimensions: { width: 200 + i, height: 100 + i },
          resizing: true,
        },
      ])
    }
    expect((getPerfCounters()?.storeNodeWrites ?? 0) - before).toBe(0)

    store.getState().onNodesChange([
      {
        id: "a",
        type: "dimensions",
        dimensions: { width: 240, height: 140 },
        resizing: false,
      },
    ])

    expect((getPerfCounters()?.storeNodeWrites ?? 0) - before).toBe(1)

    ydoc.destroy()
  })

  it("tracks only the store origin: a remote-origin edit never enters the undo stack", () => {
    // The always-on UndoManager pins every tracked struct (defeating Yjs GC) —
    // the root cause of the freeze. Tracking a peer/remote origin would pin
    // remote structs too AND make Cmd+Z revert collaborators' edits. This fails
    // if `trackedOrigins` drops STORE_ORIGIN or admits another origin.
    const ydoc = new Y.Doc()
    const store = createDiagramStore(ydoc)
    store.getState().setNodes([makeNode("a", 0)])
    store.getState().initializeUndoManager()
    const undoManager = store.getState().undoManager
    if (!undoManager) throw new Error("expected undoManager to be initialized")

    // A write under a non-store origin (as if applied from a peer) must not push.
    ydoc.transact(() => {
      getNodesMap(ydoc).set("a", makeNode("a", 123))
    }, "remote")
    expect(undoManager.undoStack.length).toBe(0)

    // A store-origin edit pushes exactly one item.
    ydoc.transact(() => {
      getNodesMap(ydoc).set("a", makeNode("a", 456))
    }, STORE_ORIGIN)
    expect(undoManager.undoStack.length).toBe(1)

    ydoc.destroy()
  })

  it("caps the undo stack length across more than 100 discrete edits while keeping undo/redo working", () => {
    const ydoc = new Y.Doc()
    const store = createDiagramStore(ydoc)
    store.getState().setNodes([makeNode("a", 0)])
    store.getState().initializeUndoManager()
    const undoManager = store.getState().undoManager
    if (!undoManager) throw new Error("expected undoManager to be initialized")

    // 150 distinct committed edits. stopCapturing() forces each into its own
    // undo item (otherwise the captureTimeout coalesces them in a single tick).
    for (let i = 1; i <= 150; i++) {
      store.getState().setNodes([makeNode("a", i)])
      undoManager.stopCapturing()
    }

    // The stack is bounded by UNDO_STACK_LIMIT rather than growing to 150.
    expect(undoManager.undoStack.length).toBe(100)

    // The retained entries still undo/redo correctly (asserted against the
    // Yjs map, which the UndoManager mutates directly).
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(150)
    undoManager.undo()
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(149)
    undoManager.redo()
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(150)

    ydoc.destroy()
  })
})
