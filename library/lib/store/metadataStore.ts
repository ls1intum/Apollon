import { create, StoreApi, UseBoundStore } from "zustand"
import { devtools, subscribeWithSelector } from "zustand/middleware"
import { parseDiagramType } from "@/utils"
import * as Y from "yjs"
import { getDiagramMetadata, STORE_ORIGIN } from "@/sync/ydoc"
import { UMLDiagramType } from "@/types"
import { ApollonMode, ApollonView } from "@/typings"
import { IPoint } from "@/edges/Connection"
import { DEFAULT_LABELS, type ApollonLabels } from "@/i18n/labels"
import type { Edge } from "@xyflow/react"

/**
 * An edge whose route is being dragged (bend or endpoint) right now, published
 * so the central solver can route every OTHER edge around the live preview.
 * `null` whenever nothing is dragging.
 */
export type LiveEdgeOverride = {
  edgeId: string
  points: IPoint[]
}

export type MetadataStore = {
  diagramTitle: string
  diagramType: UMLDiagramType
  mode: ApollonMode
  view: ApollonView
  availableViews: ApollonView[]
  readonly: boolean
  debug: boolean
  scrollLock: boolean
  /** User-facing strings for the editor's own chrome; host-overridable for i18n. */
  labels: ApollonLabels
  scrollEnabled: boolean
  connectionGuidanceActive: boolean
  connectionGuidanceSourceNodeId: string | null
  connectionGuidanceSourceHandleId: string | null
  reconnectPreviewEdgeId: string | null
  reconnectPreviewHandleType: "source" | "target" | null
  reconnectPreviewBasePoints: IPoint[]
  liveEdgeOverride: LiveEdgeOverride | null
  /** A NEW connection being drawn onto a node, published as a transient edge so
   * the central solver routes every OTHER edge as if it already existed — the
   * neighbours fan/re-anchor to make room LIVE, instead of jumping on release.
   * Never touches the diagram store (no undo/Yjs); cleared when the drag ends. */
  pendingConnectionEdge: Edge | null
  /** The id the edge under construction WILL be committed with, minted once when the
   * drag starts. The preview must carry it: parallel siblings tie on every geometric
   * key, so `computeParallelInfo` settles their lane order by edge id — preview and
   * commit therefore have to share one identity, or the bundle re-lanes on release
   * (the very jump the preview exists to prevent). Null when no drag is in flight. */
  pendingConnectionId: string | null
  setMode: (mode: ApollonMode) => void
  setView: (view: ApollonView) => void
  setAvailableViews: (availableViews: ApollonView[]) => void
  setPendingConnectionEdge: (edge: Edge | null) => void
  setPendingConnectionId: (id: string | null) => void
  setReadonly: (readonly: boolean) => void
  setScrollLock: (scrollLock: boolean) => void
  setLabels: (labels: ApollonLabels) => void
  setScrollEnabled: (scrollEnabled: boolean) => void
  startConnectionGuidance: (
    sourceNodeId: string | null,
    sourceHandleId: string | null
  ) => void
  stopConnectionGuidance: () => void
  startReconnectPreview: (
    edgeId: string,
    handleType: "source" | "target",
    basePoints: IPoint[]
  ) => void
  stopReconnectPreview: () => void
  setLiveEdgeOverride: (override: LiveEdgeOverride | null) => void
  updateDiagramTitle: (diagramTitle: string) => void
  updateDiagramType: (diagramType: UMLDiagramType) => void
  updateMetaData: (diagramTitle: string, diagramType: UMLDiagramType) => void
  updateMetaDataFromYjs: () => void
  reset: () => void
  setDebug: (debug: boolean) => void
}

type InitialMetadataState = {
  diagramTitle: string
  diagramType: UMLDiagramType
  mode: ApollonMode
  view: ApollonView
  availableViews: ApollonView[]
  readonly: boolean
  debug: boolean
  scrollLock: boolean
  labels: ApollonLabels
  scrollEnabled: boolean
  connectionGuidanceActive: boolean
  connectionGuidanceSourceNodeId: string | null
  connectionGuidanceSourceHandleId: string | null
  reconnectPreviewEdgeId: string | null
  reconnectPreviewHandleType: "source" | "target" | null
  reconnectPreviewBasePoints: IPoint[]
  liveEdgeOverride: LiveEdgeOverride | null
  pendingConnectionEdge: Edge | null
  pendingConnectionId: string | null
}
const initialMetadataState: InitialMetadataState = {
  // Empty by default — an untitled diagram stays untitled (hosts render their own
  // muted placeholder); never auto-populate a real title.
  diagramTitle: "",
  diagramType: UMLDiagramType.ClassDiagram,
  mode: ApollonMode.Modelling,
  view: ApollonView.Modelling,
  availableViews: [ApollonView.Modelling],
  readonly: false,
  debug: false,
  scrollLock: false,
  labels: DEFAULT_LABELS,
  scrollEnabled: false,
  connectionGuidanceActive: false,
  connectionGuidanceSourceNodeId: null,
  connectionGuidanceSourceHandleId: null,
  reconnectPreviewEdgeId: null,
  reconnectPreviewHandleType: null,
  reconnectPreviewBasePoints: [],
  liveEdgeOverride: null,
  pendingConnectionEdge: null,
  pendingConnectionId: null,
}

export const createMetadataStore = (
  ydoc: Y.Doc,
  /**
   * Cross-store getter for the diagram store's `previewMode` flag. When
   * true, every `ydoc.transact("store", …)` write here no-ops — the
   * canvas is showing an ephemeral preview overlay and Yjs must stay
   * pristine. The diagram store factory owns the source of truth; this
   * factory accepts a getter so the two stores can share the gate
   * without a circular import.
   */
  isPreviewMode: () => boolean = () => false
): UseBoundStore<StoreApi<MetadataStore>> => {
  const transactStore = (fn: () => void) => {
    if (isPreviewMode()) return
    ydoc.transact(fn, STORE_ORIGIN)
  }
  return create<MetadataStore>()(
    devtools(
      subscribeWithSelector((set) => ({
        ...initialMetadataState,

        updateDiagramTitle: (diagramTitle) => {
          transactStore(() => {
            getDiagramMetadata(ydoc).set("diagramTitle", diagramTitle)
          })
          set({ diagramTitle }, undefined, "updateDiagramTitle")
        },

        updateDiagramType: (type) => {
          transactStore(() => {
            getDiagramMetadata(ydoc).set("diagramType", type)
          })
          set({ diagramType: type }, undefined, "updateDiagramType")
        },

        updateMetaData: (diagramTitle, diagramType) => {
          transactStore(() => {
            getDiagramMetadata(ydoc).set("diagramTitle", diagramTitle)
            getDiagramMetadata(ydoc).set("diagramType", diagramType)
          })
          set(
            {
              diagramTitle,
              diagramType,
            },
            undefined,
            "updateMetaData"
          )
        },

        updateMetaDataFromYjs: () =>
          set(
            {
              diagramTitle: getDiagramMetadata(ydoc).get("diagramTitle") || "",
              diagramType: parseDiagramType(
                getDiagramMetadata(ydoc).get("diagramType")
              ),
            },
            undefined,
            "updateMetaDataFromYjs"
          ),

        setMode: (mode) => {
          set({ mode }, undefined, "setMode")
        },

        setView: (view) => {
          set({ view }, undefined, "setView")
        },

        setAvailableViews: (availableViews) => {
          set({ availableViews }, undefined, "setAvailableViews")
        },

        setReadonly: (readonly) => {
          set({ readonly }, undefined, "setReadonly")
        },

        setScrollLock: (scrollLock: boolean) => {
          set({ scrollLock }, undefined, "setScrollLock")
        },

        setLabels: (labels) => {
          // Skip the write when the merged labels are value-equal to the current
          // set. Hosts routinely pass an inline `labels={{…}}` literal (new object
          // every render); without this guard every parent render would rewrite
          // the store and re-render every `useLabels` subscriber (all chrome).
          set(
            (s) => {
              const next = labels as unknown as Record<string, unknown>
              const cur = s.labels as unknown as Record<string, unknown>
              for (const key in next) {
                if (next[key] !== cur[key]) return { labels }
              }
              return s
            },
            undefined,
            "setLabels"
          )
        },

        setScrollEnabled: (scrollEnabled: boolean) => {
          set({ scrollEnabled }, undefined, "setScrollEnabled")
        },

        startConnectionGuidance: (sourceNodeId, sourceHandleId) => {
          set(
            {
              connectionGuidanceActive: true,
              connectionGuidanceSourceNodeId: sourceNodeId,
              connectionGuidanceSourceHandleId: sourceHandleId,
            },
            undefined,
            "startConnectionGuidance"
          )
        },

        stopConnectionGuidance: () => {
          set(
            {
              connectionGuidanceActive: false,
              connectionGuidanceSourceNodeId: null,
              connectionGuidanceSourceHandleId: null,
            },
            undefined,
            "stopConnectionGuidance"
          )
        },

        startReconnectPreview: (edgeId, handleType, basePoints) => {
          set(
            {
              reconnectPreviewEdgeId: edgeId,
              reconnectPreviewHandleType: handleType,
              reconnectPreviewBasePoints: basePoints.map((point) => ({
                ...point,
              })),
            },
            undefined,
            "startReconnectPreview"
          )
        },

        stopReconnectPreview: () => {
          set(
            {
              reconnectPreviewEdgeId: null,
              reconnectPreviewHandleType: null,
              reconnectPreviewBasePoints: [],
            },
            undefined,
            "stopReconnectPreview"
          )
        },

        setLiveEdgeOverride: (override) => {
          set({ liveEdgeOverride: override }, undefined, "setLiveEdgeOverride")
        },

        setPendingConnectionEdge: (edge) => {
          set(
            { pendingConnectionEdge: edge },
            undefined,
            "setPendingConnectionEdge"
          )
        },

        setPendingConnectionId: (id) => {
          set({ pendingConnectionId: id }, undefined, "setPendingConnectionId")
        },

        setDebug: (debug) => {
          set({ debug }, undefined, "setDebug")
        },

        reset: () => {
          set(initialMetadataState, undefined, "reset")
        },
      })),
      { name: "MetadataStore", enabled: true }
    )
  )
}
