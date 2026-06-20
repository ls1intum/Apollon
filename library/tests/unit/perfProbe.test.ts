import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import * as Y from "yjs"
import { ApollonEditor } from "@/apollon-editor"
import { createDiagramStore } from "@/store/diagramStore"
import { getPerfCounters } from "@/sync/perfCounters"
import { getNodesMap, STORE_ORIGIN } from "@/sync/ydoc"
import { UMLDiagramType } from "@/types"
import type { DraggingNode, UMLModel } from "@/typings"

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

  it("exposes a probe that tracks the live nodes map under DEV", () => {
    const baseline = editor.__perf()
    if (!baseline) throw new Error("expected __perf() to be defined under DEV")
    expect(baseline.nodesMapSize).toBe(0)

    editor.model = makeModel(4)

    const after = editor.__perf()
    if (!after) throw new Error("expected __perf() to be defined under DEV")

    expect(after.nodesMapSize).toBe(4)
  })

  it("returns undefined in production (the build-time dead-code stub contract)", () => {
    vi.stubEnv("DEV", false)
    try {
      expect(editor.__perf()).toBeUndefined()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it("commits a settle-frame node change to Yjs and counts the write", () => {
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

    expect((getPerfCounters()?.storeNodeWrites ?? 0) - before).toBe(1)
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(999)

    ydoc.destroy()
  })

  it("keeps transient drag frames out of the document in both modes, broadcasting them over awareness in collaboration", () => {
    // Single-user (default): transient drag frames are skipped — no doc write,
    // no awareness publisher wired. Positions advance each frame so the
    // deepEqual short-circuit at the top of onNodesChange doesn't swallow them
    // and mask the guard.
    const singleUserDoc = new Y.Doc()
    const singleUserStore = createDiagramStore(singleUserDoc)
    singleUserStore.getState().setNodes([makeNode("a", 0)])
    singleUserStore.getState().initializeUndoManager()

    const singleUserBefore = getPerfCounters()?.storeNodeWrites ?? 0
    for (let i = 1; i <= 30; i++) {
      singleUserStore.getState().onNodesChange([
        {
          id: "a",
          type: "position",
          position: { x: i, y: 0 },
          dragging: true,
        },
      ])
    }
    expect((getPerfCounters()?.storeNodeWrites ?? 0) - singleUserBefore).toBe(0)
    singleUserDoc.destroy()

    // Collaboration: transient frames are STILL not persisted (the UndoManager
    // is active here too and would otherwise pin every per-frame struct), but
    // each frame is forwarded to the awareness publisher so peers see the live
    // drag. The settle frame persists once and clears the overlay.
    const collabDoc = new Y.Doc()
    const collabStore = createDiagramStore(collabDoc)
    collabStore.getState().setNodes([makeNode("a", 0)])
    collabStore.getState().setCollaborationEnabled(true)

    const published: (DraggingNode[] | null)[] = []
    collabStore
      .getState()
      .setDraggingNodesPublisher((nodes) => published.push(nodes))

    const collabBefore = getPerfCounters()?.storeNodeWrites ?? 0
    for (let i = 1; i <= 30; i++) {
      collabStore.getState().onNodesChange([
        {
          id: "a",
          type: "position",
          position: { x: i, y: 0 },
          dragging: true,
        },
      ])
    }
    // Not persisted, but broadcast live over awareness. A position drag
    // carries position only — no width/height payload.
    expect((getPerfCounters()?.storeNodeWrites ?? 0) - collabBefore).toBe(0)
    expect(published.length).toBe(30)
    expect(published.at(-1)).toEqual([{ id: "a", position: { x: 30, y: 0 } }])

    // A settle frame that MOVES the node writes once, and clears the overlay
    // AFTER that write (so peers apply the durable position before the overlay
    // drops — no snap-back).
    const beforeSettle = getPerfCounters()?.storeNodeWrites ?? 0
    collabStore.getState().onNodesChange([
      {
        id: "a",
        type: "position",
        position: { x: 31, y: 0 },
        dragging: false,
      },
    ])
    expect((getPerfCounters()?.storeNodeWrites ?? 0) - beforeSettle).toBe(1)
    expect(published.at(-1)).toBeNull()

    // The drag-stop clear path: a fresh live frame re-arms the overlay, and
    // endTransientNodeBroadcast (what onNodeDragStop calls after its settle
    // write) tears it down. This is the fallback for a drag that ends with no
    // onNodesChange settle frame of its own.
    collabStore.getState().onNodesChange([
      {
        id: "a",
        type: "position",
        position: { x: 99, y: 0 },
        dragging: true,
      },
    ])
    expect(published.at(-1)).toEqual([{ id: "a", position: { x: 99, y: 0 } }])
    collabStore.getState().endTransientNodeBroadcast()
    expect(published.at(-1)).toBeNull()

    collabDoc.destroy()
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
    store.getState().initializeUndoManager()

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

  it("broadcasts nested-resize parent auto-grow live without persisting it per frame", () => {
    // A child resize grows its parent: useHandleOnResize calls
    // useReactFlow().updateNode(parent), which in controlled mode surfaces as a
    // full-node `replace` on every frame. Persisting those would each pin a
    // struct under the always-on UndoManager (the nested-node twin of the drag
    // freeze), so they're skipped — but they must still reach peers over
    // awareness so the container grows live instead of jumping at settle.
    const ydoc = new Y.Doc()
    const store = createDiagramStore(ydoc)
    const parent = { ...makeNode("p", 0), width: 300, height: 300 }
    const child = { ...makeNode("c", 50), parentId: "p" }
    store.getState().setNodes([parent, child])
    store.getState().setCollaborationEnabled(true)
    const published: (DraggingNode[] | null)[] = []
    store.getState().setDraggingNodesPublisher((nodes) => published.push(nodes))
    store.getState().initializeUndoManager()
    const undoManager = store.getState().undoManager
    if (!undoManager) throw new Error("expected undoManager to be initialized")

    const baseBytes = Y.encodeStateAsUpdate(ydoc).byteLength

    // 60 resize frames: the child resizes (transient) and the parent grows via
    // a per-frame `replace`. Neither must persist.
    for (let i = 1; i <= 60; i++) {
      store.getState().onNodesChange([
        {
          id: "c",
          type: "dimensions",
          dimensions: { width: 200 + i, height: 100 + i },
          resizing: true,
        },
      ])
      store.getState().onNodesChange([
        {
          id: "p",
          type: "replace",
          item: { ...parent, width: 300 + i, height: 300 + i },
        },
      ])
    }
    // Nothing persisted mid-resize: the parent stays at its pre-resize size.
    expect(getNodesMap(ydoc).get("p")?.width).toBe(300)
    // ...but the parent's live grow WAS broadcast to peers, up to its final size.
    expect(published.flat().some((n) => n?.id === "p" && n.width === 360)).toBe(
      true
    )

    // Resize end commits the settled geometry once: child AND grown parent.
    store.getState().onNodesChange([
      {
        id: "c",
        type: "dimensions",
        dimensions: { width: 260, height: 160 },
        resizing: false,
      },
    ])
    expect(getNodesMap(ydoc).get("p")?.width).toBe(360)

    // Freeze-safe: the 60 frames didn't grow the doc, and the whole resize is a
    // single undo step rather than 60 pinned structs.
    expect(Y.encodeStateAsUpdate(ydoc).byteLength - baseBytes).toBeLessThan(
      1500
    )
    expect(undoManager.undoStack.length).toBe(1)

    ydoc.destroy()
  })

  it("tracks only the store origin: a remote-origin edit never enters the undo stack", () => {
    // The always-on UndoManager pins every tracked struct (defeating Yjs GC),
    // so tracking a peer/remote origin would pin remote structs too AND make
    // Cmd+Z revert collaborators' edits. This fails if `trackedOrigins` drops
    // STORE_ORIGIN or admits another origin.
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

  it("keeps a full, unbounded undo history (no cap drops old steps)", () => {
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

    // Every edit is still undoable — the history is not truncated.
    expect(undoManager.undoStack.length).toBe(150)
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(150)

    // Undoing all 150 walks back to the pre-history state.
    for (let i = 0; i < 150; i++) undoManager.undo()
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(0)

    ydoc.destroy()
  })

  it("makes one drag a single undo step that undoes and redoes", () => {
    const ydoc = new Y.Doc()
    const store = createDiagramStore(ydoc)
    store.getState().setNodes([makeNode("a", 0)])
    store.getState().initializeUndoManager()
    const undoManager = store.getState().undoManager
    if (!undoManager) throw new Error("expected undoManager to be initialized")

    // A drag: many transient frames (skipped) followed by the settle frame.
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
    store.getState().onNodesChange([
      {
        id: "a",
        type: "position",
        position: { x: 61, y: 0 },
        dragging: false,
      },
    ])

    // The whole gesture is one undo step (not one per frame).
    expect(undoManager.undoStack.length).toBe(1)
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(61)

    undoManager.undo()
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(0)
    undoManager.redo()
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(61)

    ydoc.destroy()
  })

  it("supports undo/redo in collaboration: a drag is one freeze-safe local undo step", () => {
    const ydoc = new Y.Doc()
    const store = createDiagramStore(ydoc)
    store.getState().setNodes([makeNode("a", 0)])
    store.getState().setCollaborationEnabled(true)
    store.getState().setDraggingNodesPublisher(() => {})
    store.getState().initializeUndoManager()
    const undoManager = store.getState().undoManager
    if (!undoManager) throw new Error("expected undoManager to be initialized")

    const baseBytes = Y.encodeStateAsUpdate(ydoc).byteLength

    // A real drag emits two "store" transactions on drop: the dragging:false
    // settle frame here, plus onNodeDragStop's setNodes (grid-snap/reparent),
    // simulated below at the snapped final x. captureTimeout must coalesce both
    // — preceded by 60 skipped transient frames — into ONE undo step.
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
    store.getState().onNodesChange([
      {
        id: "a",
        type: "position",
        position: { x: 61, y: 0 },
        dragging: false,
      },
    ])
    store.getState().setNodes([makeNode("a", 64)]) // onNodeDragStop settle

    // Freeze-safe: the 60 transient frames never touched the document, so the
    // doc grew by only the two settle writes (~250 bytes) instead of ~60×
    // that, even though the UndoManager pins every tracked struct.
    expect(Y.encodeStateAsUpdate(ydoc).byteLength - baseBytes).toBeLessThan(500)

    // The settle frame + drag-stop write coalesce into one undo step that walks
    // back to the pre-drag position.
    expect(undoManager.undoStack.length).toBe(1)
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(64)
    undoManager.undo()
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(0)
    undoManager.redo()
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(64)

    ydoc.destroy()
  })

  it("restores the selection that was active when an undone edit was made", () => {
    const ydoc = new Y.Doc()
    const store = createDiagramStore(ydoc)
    store.getState().setNodes([makeNode("a", 0), makeNode("b", 250)])
    store.getState().initializeUndoManager()
    const undoManager = store.getState().undoManager
    if (!undoManager) throw new Error("expected undoManager to be initialized")

    // Select "a", then make a tracked edit while "a" is selected.
    store.getState().setSelectedElementsId(["a"])
    store.getState().setNodes([makeNode("a", 50), makeNode("b", 250)])
    undoManager.stopCapturing()

    // Move the selection elsewhere, then undo the edit.
    store.getState().setSelectedElementsId(["b"])
    expect(store.getState().selectedElementIds).toEqual(["b"])

    undoManager.undo()

    // Undo brings back both the content and the selection context.
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(0)
    expect(store.getState().selectedElementIds).toEqual(["a"])
    expect(store.getState().nodes.find((n) => n.id === "a")?.selected).toBe(
      true
    )
    expect(
      store.getState().nodes.find((n) => n.id === "b")?.selected
    ).toBeFalsy()

    ydoc.destroy()
  })

  it("ignores undo/redo while a version preview is active", () => {
    const ydoc = new Y.Doc()
    const store = createDiagramStore(ydoc)
    store.getState().setNodes([makeNode("a", 0)])
    store.getState().initializeUndoManager()
    store.getState().setNodes([makeNode("a", 50)])

    // undo/redo create their own Yjs transactions and would otherwise bypass
    // the transactStore preview gate, mutating the canonical doc behind a
    // version preview.
    store.getState().setPreviewMode(true)
    store.getState().undo()
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(50)

    // Leaving preview restores undo.
    store.getState().setPreviewMode(false)
    store.getState().undo()
    expect(getNodesMap(ydoc).get("a")?.position.x).toBe(0)

    ydoc.destroy()
  })
})
