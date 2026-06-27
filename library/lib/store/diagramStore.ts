import { create, StoreApi, UseBoundStore } from "zustand"
import { devtools, subscribeWithSelector } from "zustand/middleware"
import {
  applyNodeChanges,
  getConnectedEdges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  applyEdgeChanges,
} from "@xyflow/react"
import * as Y from "yjs"
import { sortNodesTopologically } from "@/utils"
import {
  getNodesMap,
  getEdgesMap,
  getAssessments,
  reconcileYMap,
  STORE_ORIGIN,
} from "@/sync/ydoc"
import { recordStoreNodeWrite } from "@/sync/perfCounters"
import { deepEqual } from "@/utils/storeUtils"
import { Assessment, DraggingNode, InteractiveElements } from "@/typings"
import {
  getNestedNodeElementIds,
  pruneInteractiveElements,
  toggleInteractiveRecord,
} from "@/utils/interactiveUtils"

type InitialDiagramState = {
  nodes: Node[]
  edges: Edge[]
  selectedElementIds: string[]
  diagramId: string
  assessments: Record<string, Assessment>
  interactiveElements: Record<string, boolean>
  interactiveRelationships: Record<string, boolean>
  interactiveSelectionInitialized: boolean
  canUndo: boolean
  canRedo: boolean
  undoManager: Y.UndoManager | null
  /**
   * Whether this editor instance is in a collaboration session. Gates the
   * ephemeral live-drag broadcast: when true, `onNodesChange` forwards each
   * transient drag/resize frame to `draggingNodesPublisher` (awareness) so peers
   * see the gesture live. Not redundant with `undoManager !== null` — the undo
   * manager now runs in both single-user and collaboration, so it can't tell
   * them apart; only this flag marks "peers are listening". (Transient frames
   * are never persisted in either mode — see `onNodesChange`.)
   */
  collaborationEnabled: boolean
  /**
   * When true, the Yjs doc is the canonical state but the canvas reflects
   * an ephemeral overlay (e.g. a version preview). In this mode:
   *   - every store mutator that would `ydoc.transact("store", …)`
   *     no-ops the Yjs write (routed through `transactStore`), so the
   *     local Yjs doc's history is unaffected by what the user is
   *     "previewing" — peer-bound broadcasts stay clean.
   *   - Yjs observers SKIP the `update*FromYjs` Zustand sync — incoming
   *     peer edits land in Yjs but don't disturb the overlay.
   * On flip-off we re-sync Zustand from Yjs so the canvas catches up to
   * everything peers committed during the preview.
   */
  previewMode: boolean
}

const initialDiagramState: InitialDiagramState = {
  nodes: [],
  edges: [],
  selectedElementIds: [],
  diagramId: Math.random().toString(36).substring(2, 15),
  assessments: {},
  interactiveElements: {},
  interactiveRelationships: {},
  interactiveSelectionInitialized: false,
  canUndo: false,
  canRedo: false,
  undoManager: null,
  collaborationEnabled: false,
  previewMode: false,
}

function stripComputedSegmentsFromEdge(edge: Edge): Edge {
  if (
    !edge.data ||
    !Object.prototype.hasOwnProperty.call(edge.data, "computedSegments")
  ) {
    return edge
  }

  const data = { ...(edge.data as Record<string, unknown>) }
  delete data.computedSegments
  return { ...edge, data }
}

function stripComputedSegmentsFromEdges(edges: Edge[]): Edge[] {
  return edges.map(stripComputedSegmentsFromEdge)
}

// The transient `selected` flag is re-overlaid locally on read
// (`updateNodesFromYjs`), so it must never be persisted: otherwise selection
// toggles become Yjs writes, undo entries and peer broadcasts.
function stripSelected(node: Node): Node {
  const persisted = { ...node }
  delete persisted.selected
  return persisted
}

function nodeEntriesForPersistence(nodes: Node[]): Array<[string, Node]> {
  return nodes.map((node) => [node.id, stripSelected(node)])
}

export type DiagramStore = {
  nodes: Node[]
  edges: Edge[]
  selectedElementIds: string[]
  diagramId: string
  assessments: Record<string, Assessment>
  interactiveElements: Record<string, boolean>
  interactiveRelationships: Record<string, boolean>
  interactiveSelectionInitialized: boolean
  canUndo: boolean
  canRedo: boolean
  undoManager: Y.UndoManager | null
  collaborationEnabled: boolean
  previewMode: boolean
  setDiagramId: (diagramId: string) => void
  setCollaborationEnabled: (enabled: boolean) => void
  /**
   * Inject the sink that forwards transient drag/resize frames onto the
   * ephemeral awareness channel (wired by `YjsSync` for every editor). Kept as
   * runtime wiring rather than diagram state so a `reset()` never clears it.
   * The broadcast itself is gated by `collaborationEnabled`, not by this sink;
   * `null` (headless, where no `YjsSync` runs) just leaves it unwired.
   */
  setDraggingNodesPublisher: (
    publisher: ((draggingNodes: DraggingNode[] | null) => void) | null
  ) => void
  /**
   * Clear the peers' live-drag overlay once a gesture's settled value is
   * committed. Called from `onNodeDragStop` (after the doc write) and on
   * collaboration teardown; a no-op when nothing is being broadcast.
   */
  endTransientNodeBroadcast: () => void
  setNodes: (payload: Node[] | ((nodes: Node[]) => Node[])) => void
  setEdges: (payload: Edge[] | ((edges: Edge[]) => Edge[])) => void
  setNodesAndEdges: (nodes: Node[], edges: Edge[]) => void
  addEdge: (edge: Edge) => void
  addNode: (node: Node) => void
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  reset: () => void
  setSelectedElementsId: (
    payload: string[] | ((edges: string[]) => string[])
  ) => void
  getAssessment: (id: string) => Assessment | undefined
  setAssessments: (
    assessments:
      | Record<string, Assessment>
      | ((prev: Record<string, Assessment>) => Record<string, Assessment>)
  ) => void
  updateNodesFromYjs: () => void
  updateEdgesFromYjs: () => void
  updateAssessmentFromYjs: () => void
  addOrUpdateAssessment: (assessment: Assessment) => void
  undo: () => void
  redo: () => void
  initializeUndoManager: () => void
  updateUndoRedoState: () => void
  toggleInteractiveElement: (elementId: string) => void
  getInteractiveForSerialization: () => InteractiveElements | undefined
  setInteractive: (interactive: InteractiveElements | undefined) => void
  isElementInteractive: (elementId: string) => boolean
  /**
   * Toggle the preview overlay. When entering, the Yjs doc is left
   * untouched by store mutators and observers. When exiting, the local
   * Zustand state is rebuilt from the (peer-augmented) Yjs maps so the
   * canvas catches up to everything that arrived during preview.
   */
  setPreviewMode: (active: boolean) => void
}

export const createDiagramStore = (
  ydoc: Y.Doc
): UseBoundStore<StoreApi<DiagramStore>> =>
  create<DiagramStore>()(
    devtools(
      subscribeWithSelector((set, get) => {
        // Single choke point for every "store"-origin Yjs write. Skips
        // the transaction entirely while the canvas is in preview mode,
        // so no `Y.Map.clear()`/`set` ever lands in the live doc and
        // contaminates peer state. Use this instead of `ydoc.transact(…,
        // "store")` directly.
        const transactStore = (fn: () => void) => {
          if (get().previewMode) return
          ydoc.transact(fn, STORE_ORIGIN)
        }

        // Ephemeral live-drag wiring (collaboration only). `YjsSync` injects
        // the publisher; `wasPublishingTransient` tracks whether a gesture is
        // mid-broadcast so `endTransientNodeBroadcast` clears the overlay once.
        let draggingNodesPublisher:
          | ((draggingNodes: DraggingNode[] | null) => void)
          | null = null
        let wasPublishingTransient = false

        return {
          ...initialDiagramState,

          initializeUndoManager: () => {
            const nodesMap = getNodesMap(ydoc)
            const edgesMap = getEdgesMap(ydoc)
            const assessmentsMap = getAssessments(ydoc)

            // Track only LOCAL ("store") writes, never "remote" — per-user
            // "local undo": each peer reverses only their own edits, never a
            // collaborator's (Yjs's own recommendation). `ignoreRemoteMapChanges`
            // stays at its default (false), so undoing a key a peer concurrently
            // changed safely no-ops instead of clobbering it.
            //
            // captureTimeout 500ms is load-bearing, not cosmetic: one drop emits
            // two "store" transactions — the onNodesChange settle frame and
            // onNodeDragStop's setNodes — and the window coalesces them into one
            // undo step. (It also folds two genuinely distinct gestures <500ms
            // apart, which is standard Yjs behaviour.)
            const undoManager = new Y.UndoManager(
              [nodesMap, edgesMap, assessmentsMap],
              {
                captureTimeout: 500,
                trackedOrigins: new Set([STORE_ORIGIN]),
              }
            )

            // Restore the user's selection across undo/redo (documented best
            // practice: undo should bring back the context, not just the
            // content). The selection in effect when an edit is recorded is
            // stashed on the stack item and re-applied — to `selectedElementIds`
            // and the per-element `selected` flags — when it is popped.
            // `stack-item-popped` fires after the undo transaction's observers,
            // so `applySelection` runs last and wins over the doc resync.
            const applySelection = (ids: string[]) => {
              const idSet = new Set(ids)
              set(
                (state) => ({
                  selectedElementIds: ids,
                  nodes: state.nodes.map((node) =>
                    (node.selected ?? false) === idSet.has(node.id)
                      ? node
                      : { ...node, selected: idSet.has(node.id) }
                  ),
                  edges: state.edges.map((edge) =>
                    (edge.selected ?? false) === idSet.has(edge.id)
                      ? edge
                      : { ...edge, selected: idSet.has(edge.id) }
                  ),
                }),
                undefined,
                "undo-restore-selection"
              )
            }

            // Capture on both add and update: a merged edit (captureTimeout
            // folds it into the existing item via "stack-item-updated") must
            // refresh the stashed selection, else it keeps the first edit's.
            const captureSelection = ({
              stackItem,
            }: {
              stackItem: Y.UndoManager["undoStack"][number]
            }) => {
              stackItem.meta.set("selectedElementIds", get().selectedElementIds)
              get().updateUndoRedoState()
            }
            undoManager.on("stack-item-added", captureSelection)
            undoManager.on("stack-item-updated", captureSelection)

            undoManager.on("stack-item-popped", ({ stackItem }) => {
              const ids = stackItem.meta.get("selectedElementIds")
              if (Array.isArray(ids)) applySelection(ids)
              get().updateUndoRedoState()
            })

            undoManager.on("stack-cleared", () => {
              get().updateUndoRedoState()
            })

            set({ undoManager }, undefined, "initializeUndoManager")
            get().updateUndoRedoState()
          },

          updateUndoRedoState: () => {
            const { undoManager } = get()
            if (!undoManager) return

            set(
              {
                canUndo: undoManager.undoStack.length > 0,
                canRedo: undoManager.redoStack.length > 0,
              },
              undefined,
              "updateUndoRedoState"
            )
          },

          undo: () => {
            // undo/redo create their own Yjs transactions, bypassing the
            // `transactStore` preview gate; guard here so Cmd+Z during a version
            // preview can't mutate the canonical doc and broadcast to peers.
            if (get().previewMode) return
            const { undoManager } = get()
            if (!undoManager || !undoManager.canUndo()) return

            undoManager.undo()
          },

          redo: () => {
            if (get().previewMode) return
            const { undoManager } = get()
            if (!undoManager || !undoManager.canRedo()) return

            undoManager.redo()
          },

          setDiagramId: (diagramId) => {
            set({ diagramId }, undefined, "setDiagramId")
          },

          setCollaborationEnabled: (enabled) => {
            // Flush any in-flight live-drag overlay when collaboration is turned
            // off mid-gesture, else peers would keep rendering the frozen drag
            // (the per-frame publish path below is itself gated on this flag).
            if (!enabled) get().endTransientNodeBroadcast()
            set(
              { collaborationEnabled: enabled },
              undefined,
              "setCollaborationEnabled"
            )
          },

          setDraggingNodesPublisher: (publisher) => {
            draggingNodesPublisher = publisher
          },

          endTransientNodeBroadcast: () => {
            // Clear the peers' live-drag overlay. Call this AFTER the settled
            // position/size has been committed to the document, so peers apply
            // the durable value before the overlay is removed (no snap-back to
            // the stale pre-gesture position).
            if (draggingNodesPublisher && wasPublishingTransient) {
              draggingNodesPublisher(null)
              wasPublishingTransient = false
            }
          },

          setSelectedElementsId: (payload) => {
            const selectedElementIds =
              typeof payload === "function"
                ? payload(get().selectedElementIds)
                : payload

            set({ selectedElementIds }, undefined, "setSelectedElementsId")
          },

          toggleInteractiveElement: (elementId) => {
            const isNode = get().nodes.some((node) => node.id === elementId)
            const isNestedNodeElement = getNestedNodeElementIds(
              get().nodes
            ).has(elementId)
            const isEdge = get().edges.some((edge) => edge.id === elementId)

            if (!isNode && !isNestedNodeElement && !isEdge) {
              return
            }

            set(
              (state) => ({
                interactiveElements:
                  isNode || isNestedNodeElement
                    ? toggleInteractiveRecord(
                        state.interactiveElements,
                        elementId
                      )
                    : state.interactiveElements,
                interactiveRelationships: isEdge
                  ? toggleInteractiveRecord(
                      state.interactiveRelationships,
                      elementId
                    )
                  : state.interactiveRelationships,
                interactiveSelectionInitialized: true,
              }),
              undefined,
              "toggleInteractiveElement"
            )
          },

          getInteractiveForSerialization: () => {
            const interactive = pruneInteractiveElements(
              {
                elements: get().interactiveElements,
                relationships: get().interactiveRelationships,
              },
              get().nodes,
              get().edges
            )
            return (
              interactive ??
              (get().interactiveSelectionInitialized
                ? { elements: {}, relationships: {} }
                : undefined)
            )
          },

          setInteractive: (interactive) => {
            const prunedInteractive = pruneInteractiveElements(
              interactive,
              get().nodes,
              get().edges
            )

            set(
              {
                interactiveElements: prunedInteractive?.elements ?? {},
                interactiveRelationships:
                  prunedInteractive?.relationships ?? {},
                interactiveSelectionInitialized: interactive !== undefined,
              },
              undefined,
              "setInteractive"
            )
          },

          isElementInteractive: (elementId) => {
            return !!(
              get().interactiveElements[elementId] ||
              get().interactiveRelationships[elementId]
            )
          },

          addNode: (node) => {
            transactStore(() => {
              getNodesMap(ydoc).set(node.id, node)
            })
            set({ nodes: [...get().nodes, node] }, undefined, "addNode")
          },

          addEdge: (edge) => {
            const persistedEdge = stripComputedSegmentsFromEdge(edge)
            transactStore(() => {
              getEdgesMap(ydoc).set(persistedEdge.id, persistedEdge)
            })
            set(
              { edges: [...get().edges, persistedEdge] },
              undefined,
              "addEdge"
            )
          },
          setNodes: (payload) => {
            const nodes =
              typeof payload === "function" ? payload(get().nodes) : payload

            if (deepEqual(get().nodes, nodes)) {
              return
            }

            transactStore(() => {
              reconcileYMap(getNodesMap(ydoc), nodeEntriesForPersistence(nodes))
            })
            const prunedInteractive = pruneInteractiveElements(
              {
                elements: get().interactiveElements,
                relationships: get().interactiveRelationships,
              },
              nodes,
              get().edges
            )
            set(
              {
                nodes,
                interactiveElements: prunedInteractive?.elements ?? {},
                interactiveRelationships:
                  prunedInteractive?.relationships ?? {},
              },
              undefined,
              "setNodes"
            )
          },

          setEdges: (payload) => {
            const edges =
              typeof payload === "function" ? payload(get().edges) : payload
            const persistedEdges = stripComputedSegmentsFromEdges(edges)

            if (deepEqual(get().edges, persistedEdges)) {
              return
            }
            transactStore(() => {
              reconcileYMap(
                getEdgesMap(ydoc),
                persistedEdges.map((edge) => [edge.id, edge])
              )
            })
            const prunedInteractive = pruneInteractiveElements(
              {
                elements: get().interactiveElements,
                relationships: get().interactiveRelationships,
              },
              get().nodes,
              persistedEdges
            )
            set(
              {
                edges: persistedEdges,
                interactiveElements: prunedInteractive?.elements ?? {},
                interactiveRelationships:
                  prunedInteractive?.relationships ?? {},
              },
              undefined,
              "setEdges"
            )
          },

          setNodesAndEdges: (nodes, edges) => {
            const persistedEdges = stripComputedSegmentsFromEdges(edges)
            transactStore(() => {
              reconcileYMap(getNodesMap(ydoc), nodeEntriesForPersistence(nodes))
              reconcileYMap(
                getEdgesMap(ydoc),
                persistedEdges.map((edge) => [edge.id, edge])
              )
            })
            const prunedInteractive = pruneInteractiveElements(
              {
                elements: get().interactiveElements,
                relationships: get().interactiveRelationships,
              },
              nodes,
              persistedEdges
            )
            set(
              {
                nodes,
                edges: persistedEdges,
                interactiveElements: prunedInteractive?.elements ?? {},
                interactiveRelationships:
                  prunedInteractive?.relationships ?? {},
              },
              undefined,
              "setNodesAndEdges"
            )
          },

          onNodesChange: (changes) => {
            const selectChanges = changes.filter(
              (change) => change.type === "select"
            )

            if (selectChanges.length > 0) {
              selectChanges.forEach((change) => {
                if (change.selected) {
                  set(
                    (state) => ({
                      selectedElementIds: [
                        ...state.selectedElementIds,
                        change.id,
                      ],
                    }),
                    undefined,
                    "onNodesChange-select"
                  )
                } else {
                  set(
                    (state) => ({
                      selectedElementIds: state.selectedElementIds.filter(
                        (id) => id !== change.id
                      ),
                    }),
                    undefined,
                    "onNodesChange-deselect"
                  )
                }
                set(
                  (state) => ({
                    nodes: state.nodes.map((node) =>
                      node.id === change.id
                        ? { ...node, selected: change.selected }
                        : node
                    ),
                  }),
                  undefined,
                  "onNodesChange-select-deselect-sync"
                )
              })
            }

            // Select changes are handled elsewhere; drop them here.
            const filteredChanges = changes.filter(
              (change) => change.type !== "select"
            )

            if (filteredChanges.length === 0) return
            const currentNodes = get().nodes

            const nextNodes = applyNodeChanges(filteredChanges, currentNodes)

            // A gesture (drag or resize) is in flight when any node still carries
            // React Flow's live dragging/resizing flag. Used to broadcast live
            // geometry below and to skip per-frame persistence in `transactStore`.
            const gestureInFlight = nextNodes.some(
              (n) => n.dragging || n.resizing
            )

            // Ephemeral live-drag broadcast (collaboration only): forward the
            // in-progress positions/sizes of this frame to peers over awareness.
            // (Other awareness writes — cursor, selection, viewport — live in
            // the React layer, but this one lives here because `onNodesChange`
            // is the only seam that sees BOTH drag and resize transient frames;
            // React's `onNodeDrag` is position-only.)
            // Clearing the overlay is deferred to `endTransientNodeBroadcast`
            // (after the settle doc write) so peers receive the durable position
            // before the overlay is removed. A position drag sends position
            // alone; width/height ride along for a resize and for a mid-gesture
            // `replace` (a parent container auto-growing around a resizing child),
            // so peers see the parent grow live instead of jumping at settle.
            let publishedLiveFrames = false
            if (
              get().collaborationEnabled &&
              !get().previewMode &&
              draggingNodesPublisher
            ) {
              const draggingNodes: DraggingNode[] = []
              for (const change of filteredChanges) {
                if (change.type === "position" && change.dragging === true) {
                  const node = nextNodes.find((n) => n.id === change.id)
                  if (node)
                    draggingNodes.push({ id: node.id, position: node.position })
                } else if (
                  (change.type === "dimensions" && change.resizing === true) ||
                  (change.type === "replace" && gestureInFlight)
                ) {
                  const id =
                    change.type === "replace" ? change.item.id : change.id
                  const node = nextNodes.find((n) => n.id === id)
                  if (node)
                    draggingNodes.push({
                      id: node.id,
                      position: node.position,
                      width: node.width ?? null,
                      height: node.height ?? null,
                    })
                }
              }
              if (draggingNodes.length > 0) {
                draggingNodesPublisher(draggingNodes)
                wasPublishingTransient = true
                publishedLiveFrames = true
              }
            }

            if (deepEqual(currentNodes, nextNodes)) {
              // Live frames already published above. If a gesture ended with no
              // net change this tick, the overlay clear is delegated to
              // onNodeDragStop's endTransientNodeBroadcast.
              return
            }

            // A `replace` that lands mid-gesture is a transient geometry
            // side-effect — e.g. a parent auto-growing around a resizing child
            // (useHandleOnResize → useReactFlow().updateNode), which in
            // controlled mode round-trips through onNodesChange as a full-node
            // `replace`. Persisting it every frame pins a struct per frame under
            // the always-on UndoManager (the nested-resize twin of the drag
            // freeze). Skip it (it was broadcast live over awareness above); the
            // settled geometry is committed by the resize-end reconcile below.
            // `gestureInFlight` reads React Flow's live dragging/resizing flags,
            // so it self-clears at gesture end — a normal (non-gesture) replace
            // still persists immediately. INVARIANT: recovery of a skipped
            // replace depends on every gesture ending with a full reconcile —
            // the `resizeSettled` reconcile here, or onNodeDragStop's setNodes
            // for a drag. Don't remove either without replacing the recovery.
            const resizeSettled = filteredChanges.some(
              (c) => c.type === "dimensions" && c.resizing === false
            )

            transactStore(() => {
              for (const change of filteredChanges) {
                if (change.type === "add" || change.type === "replace") {
                  if (change.type === "replace" && gestureInFlight) continue
                  getNodesMap(ydoc).set(
                    change.item.id,
                    stripSelected(change.item)
                  )
                  recordStoreNodeWrite()
                } else if (change.type === "remove") {
                  set(
                    (state) => ({
                      selectedElementIds: state.selectedElementIds.filter(
                        (id) => id !== change.id
                      ),
                    }),
                    undefined,
                    "onNodesChange-remove-selectedElementIds"
                  )
                  const deletedNode = getNodesMap(ydoc).get(change.id)
                  if (deletedNode) {
                    const connectedEdges = getConnectedEdges(
                      [deletedNode],
                      get().edges
                    )
                    getNodesMap(ydoc).delete(change.id)
                    connectedEdges.forEach((edge) =>
                      getEdgesMap(ydoc).delete(edge.id)
                    )
                  }
                } else {
                  const isTransient =
                    (change.type === "position" && change.dragging === true) ||
                    (change.type === "dimensions" && change.resizing === true)
                  // Transient drag/resize frames are never persisted, in either
                  // mode: the UndoManager (now active in collaboration too) pins
                  // every per-frame struct, so writing them would grow the
                  // document unbounded. Only the settled frame is committed; the
                  // live gesture reaches peers via the awareness broadcast above.
                  if (isTransient) continue
                  const node = nextNodes.find((n) => n.id === change.id)
                  if (node) {
                    getNodesMap(ydoc).set(change.id, stripSelected(node))
                    recordStoreNodeWrite()
                  }
                }
              }

              // Commit any parent geometry that was deferred while the resize
              // was in flight (the skipped per-frame `replace` writes above).
              // `reconcileYMap` only writes keys that actually changed, so this
              // is the single settled write for the grown parents — and a no-op
              // for the child already committed in the loop.
              if (resizeSettled) {
                reconcileYMap(
                  getNodesMap(ydoc),
                  nodeEntriesForPersistence(nextNodes)
                )
              }
            })
            const prunedInteractive = pruneInteractiveElements(
              {
                elements: get().interactiveElements,
                relationships: get().interactiveRelationships,
              },
              nextNodes,
              get().edges
            )

            set(
              {
                nodes: nextNodes,
                interactiveElements: prunedInteractive?.elements ?? {},
                interactiveRelationships:
                  prunedInteractive?.relationships ?? {},
              },
              undefined,
              "onNodesChange"
            )

            // A settle/idle batch (no live frames this tick) that follows a
            // gesture: the durable value was just committed above, so it's now
            // safe to clear the peers' overlay. Resize ends this way (no
            // drag-stop hook); drag also clears here when the settle frame moved
            // the node, and via onNodeDragStop otherwise.
            if (get().collaborationEnabled && !publishedLiveFrames) {
              get().endTransientNodeBroadcast()
            }
          },

          onEdgesChange: (changes) => {
            const selectChanges = changes.filter(
              (change) => change.type === "select"
            )
            if (selectChanges.length > 0) {
              selectChanges.forEach((change) => {
                if (change.selected) {
                  set(
                    (state) => ({
                      selectedElementIds: [
                        ...state.selectedElementIds,
                        change.id,
                      ],
                    }),
                    undefined,
                    "onEdgesChange-select"
                  )
                } else {
                  set(
                    (state) => ({
                      selectedElementIds: state.selectedElementIds.filter(
                        (id) => id !== change.id
                      ),
                    }),
                    undefined,
                    "onEdgesChange-deselect"
                  )
                }
                set(
                  (state) => ({
                    edges: state.edges.map((edge) =>
                      edge.id === change.id
                        ? { ...edge, selected: change.selected }
                        : edge
                    ),
                  }),
                  undefined,
                  "onEdgesChange-select-deselect-sync"
                )
              })
            }

            const changesWithoutSelect = changes.filter(
              (change) => change.type !== "select"
            )

            if (changesWithoutSelect.length === 0) return

            const currentEdges = get().edges
            const nextEdges = applyEdgeChanges(
              changesWithoutSelect,
              currentEdges
            )
            const persistedNextEdges = stripComputedSegmentsFromEdges(nextEdges)
            if (deepEqual(currentEdges, persistedNextEdges)) {
              return
            }

            transactStore(() => {
              for (const change of changes) {
                if (change.type === "add" || change.type === "replace") {
                  const persistedEdge = stripComputedSegmentsFromEdge(
                    change.item
                  )
                  getEdgesMap(ydoc).set(persistedEdge.id, persistedEdge)
                } else if (change.type === "remove") {
                  set(
                    (state) => ({
                      selectedElementIds: state.selectedElementIds.filter(
                        (id) => id !== change.id
                      ),
                    }),
                    undefined,
                    "onEdgesChange-remove"
                  )
                  getEdgesMap(ydoc).delete(change.id)
                }
              }
            })
            const prunedInteractive = pruneInteractiveElements(
              {
                elements: get().interactiveElements,
                relationships: get().interactiveRelationships,
              },
              get().nodes,
              persistedNextEdges
            )

            set(
              {
                edges: persistedNextEdges,
                interactiveElements: prunedInteractive?.elements ?? {},
                interactiveRelationships:
                  prunedInteractive?.relationships ?? {},
              },
              undefined,
              "onEdgesChange"
            )
          },

          reset: () => {
            const { undoManager } = get()
            if (undoManager) {
              undoManager.clear()
            }
            set(initialDiagramState, undefined, "reset")
          },

          updateNodesFromYjs: () => {
            const preserveSelectedNodesAfterYdoc = sortNodesTopologically(
              Array.from(getNodesMap(ydoc).values())
            ).map((node) => {
              const currentNode = get().nodes.find((n) => n.id === node.id)
              if (currentNode) {
                return { ...node, selected: currentNode.selected }
              } else {
                return node
              }
            })

            // Find removed nodes that are not in the Yjs document
            // and remove them from the selectedElementIds
            // This is necessary to keep the selection in sync with the Yjs document
            // and to avoid selecting nodes that are no longer present in state
            const removedNodes = get().nodes.filter(
              (node) =>
                !preserveSelectedNodesAfterYdoc.some((n) => n.id === node.id)
            )
            if (removedNodes.length > 0) {
              set(
                (state) => ({
                  selectedElementIds: state.selectedElementIds.filter(
                    (id) =>
                      !removedNodes.some((removedNode) => removedNode.id === id)
                  ),
                }),
                undefined,
                "updateNodesFromYjs-selection-remove"
              )
            }

            const prunedInteractive = pruneInteractiveElements(
              {
                elements: get().interactiveElements,
                relationships: get().interactiveRelationships,
              },
              preserveSelectedNodesAfterYdoc,
              get().edges
            )

            set(
              {
                nodes: preserveSelectedNodesAfterYdoc,
                interactiveElements: prunedInteractive?.elements ?? {},
                interactiveRelationships:
                  prunedInteractive?.relationships ?? {},
              },
              undefined,
              "updateNodesFromYjs"
            )
          },

          updateEdgesFromYjs: () => {
            const preserveSelectedEdgesAfterYdoc = Array.from(
              getEdgesMap(ydoc).values()
            ).map((edge) => {
              const currentEdge = get().edges.find((e) => e.id === edge.id)
              if (currentEdge) {
                return stripComputedSegmentsFromEdge({
                  ...edge,
                  selected: currentEdge.selected,
                })
              } else {
                return stripComputedSegmentsFromEdge(edge)
              }
            })

            // Find removed edges that are not in the Yjs document
            // and remove them from the selectedElementIds
            // This is necessary to keep the selection in sync with the Yjs document
            // and to avoid selecting edges that are no longer present in state
            const removedEdges = get().edges.filter(
              (edge) =>
                !preserveSelectedEdgesAfterYdoc.some((e) => e.id === edge.id)
            )
            if (removedEdges.length > 0) {
              set(
                (state) => ({
                  selectedElementIds: state.selectedElementIds.filter(
                    (id) =>
                      !removedEdges.some((removedEdge) => removedEdge.id === id)
                  ),
                }),
                undefined,
                "updateEdgesFromYjs-selection-remove"
              )
            }

            const prunedInteractive = pruneInteractiveElements(
              {
                elements: get().interactiveElements,
                relationships: get().interactiveRelationships,
              },
              get().nodes,
              preserveSelectedEdgesAfterYdoc
            )

            set(
              {
                edges: preserveSelectedEdgesAfterYdoc,
                interactiveElements: prunedInteractive?.elements ?? {},
                interactiveRelationships:
                  prunedInteractive?.relationships ?? {},
              },
              undefined,
              "updateEdgesFromYjs"
            )
          },

          setAssessments: (payload) => {
            const assessments =
              typeof payload === "function"
                ? payload(get().assessments)
                : payload

            transactStore(() => {
              reconcileYMap(getAssessments(ydoc), Object.entries(assessments))
            })

            set({ assessments }, undefined, "setAssessments")
          },

          updateAssessmentFromYjs: () => {
            const yMap = getAssessments(ydoc)
            const assessments: Record<string, Assessment> = {}

            yMap.forEach((value, key) => {
              assessments[key] = value
            })

            set({ assessments }, undefined, "updateAssessmentFromYjs")
          },

          getAssessment: (id) => {
            return get().assessments[id]
          },

          setPreviewMode: (active) => {
            const wasActive = get().previewMode
            if (active === wasActive) return
            set({ previewMode: active }, undefined, "setPreviewMode")
            // On flip-off, the Zustand caches are stale (peers may have
            // edited Yjs while we were showing the preview overlay) — pull
            // every observed surface from Yjs so the canvas catches up.
            // Metadata included: a peer may have renamed the diagram or
            // changed its type while we were in preview.
            if (!active) {
              get().updateNodesFromYjs()
              get().updateEdgesFromYjs()
              get().updateAssessmentFromYjs()
            }
          },

          addOrUpdateAssessment: (assessment) => {
            transactStore(() => {
              getAssessments(ydoc).set(assessment.modelElementId, assessment)
            })
            set(
              (state) => ({
                assessments: {
                  ...state.assessments,
                  [assessment.modelElementId]: assessment,
                },
              }),
              undefined,
              "addOrUpdateAssessment"
            )
          },
        }
      }),
      { name: "DiagramStore", enabled: true }
    )
  )
