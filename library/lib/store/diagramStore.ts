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
import { getNodesMap, getEdgesMap, getAssessments } from "@/sync/ydoc"
import { deepEqual } from "@/utils/storeUtils"
import { Assessment, InteractiveElements } from "@/typings"
import {
  getNestedNodeElementIds,
  pruneInteractiveElements,
  toggleInteractiveRecord,
} from "@/utils/interactiveUtils"

export type DiagramStoreData = {
  nodes: Node[]
  edges: Edge[]
}

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
  previewMode: false,
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
  previewMode: boolean
  setDiagramId: (diagramId: string) => void
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
          ydoc.transact(fn, "store")
        }
        return {
          ...initialDiagramState,

          initializeUndoManager: () => {
            const nodesMap = getNodesMap(ydoc)
            const edgesMap = getEdgesMap(ydoc)
            const assessmentsMap = getAssessments(ydoc)

            // Track only LOCAL ("store") writes. Including "remote" would
            // pollute the local undo stack with peer edits — Cmd+Z would
            // then revert a collaborator's change, which is never the
            // intended undo semantics (Yjs's recommendation is the same:
            // pass `trackedOrigins` containing only origins YOU author).
            const undoManager = new Y.UndoManager(
              [nodesMap, edgesMap, assessmentsMap],
              {
                captureTimeout: 500,
                trackedOrigins: new Set(["store"]),
              }
            )

            // Listen to undo manager state changes
            undoManager.on("stack-item-added", () => {
              get().updateUndoRedoState()
            })

            undoManager.on("stack-item-popped", () => {
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
            const { undoManager } = get()
            if (!undoManager || !undoManager.canUndo()) return

            undoManager.undo()
          },

          redo: () => {
            const { undoManager } = get()
            if (!undoManager || !undoManager.canRedo()) return

            undoManager.redo()
          },

          setDiagramId: (diagramId) => {
            set({ diagramId }, undefined, "setDiagramId")
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
            transactStore(() => {
              getEdgesMap(ydoc).set(edge.id, edge)
            })
            set({ edges: [...get().edges, edge] }, undefined, "addEdge")
          },
          setNodes: (payload) => {
            const nodes =
              typeof payload === "function" ? payload(get().nodes) : payload

            if (deepEqual(get().nodes, nodes)) {
              return
            }

            transactStore(() => {
              getNodesMap(ydoc).clear()
              nodes.forEach((node) => getNodesMap(ydoc).set(node.id, node))
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

            if (deepEqual(get().edges, edges)) {
              return
            }
            transactStore(() => {
              getEdgesMap(ydoc).clear()
              edges.forEach((edge) => getEdgesMap(ydoc).set(edge.id, edge))
            })
            const prunedInteractive = pruneInteractiveElements(
              {
                elements: get().interactiveElements,
                relationships: get().interactiveRelationships,
              },
              get().nodes,
              edges
            )
            set(
              {
                edges,
                interactiveElements: prunedInteractive?.elements ?? {},
                interactiveRelationships:
                  prunedInteractive?.relationships ?? {},
              },
              undefined,
              "setEdges"
            )
          },

          setNodesAndEdges: (nodes, edges) => {
            transactStore(() => {
              getNodesMap(ydoc).clear()
              getEdgesMap(ydoc).clear()
              nodes.forEach((node) => getNodesMap(ydoc).set(node.id, node))
              edges.forEach((edge) => getEdgesMap(ydoc).set(edge.id, edge))
            })
            const prunedInteractive = pruneInteractiveElements(
              {
                elements: get().interactiveElements,
                relationships: get().interactiveRelationships,
              },
              nodes,
              edges
            )
            set(
              {
                nodes,
                edges,
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

            // Select changes are handled previously
            const filteredChanges = changes.filter(
              (change) => change.type !== "select"
            )

            if (filteredChanges.length === 0) return
            const currentNodes = get().nodes

            const nextNodes = applyNodeChanges(filteredChanges, currentNodes)
            if (deepEqual(currentNodes, nextNodes)) {
              return
            }

            transactStore(() => {
              for (const change of filteredChanges) {
                if (change.type === "add" || change.type === "replace") {
                  getNodesMap(ydoc).set(change.item.id, change.item)
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
                  const node = nextNodes.find((n) => n.id === change.id)
                  if (node) getNodesMap(ydoc).set(change.id, node)
                }
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
            if (deepEqual(currentEdges, nextEdges)) {
              return
            }

            transactStore(() => {
              for (const change of changes) {
                if (change.type === "add" || change.type === "replace") {
                  getEdgesMap(ydoc).set(change.item.id, change.item)
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
              nextEdges
            )

            set(
              {
                edges: nextEdges,
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
                return { ...edge, selected: currentEdge.selected }
              } else {
                return edge
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
              const yMap = getAssessments(ydoc)
              yMap.clear()
              Object.entries(assessments).forEach(([id, assessment]) => {
                yMap.set(id, assessment)
              })
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
