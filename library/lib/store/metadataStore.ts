import { create, StoreApi, UseBoundStore } from "zustand"
import { devtools, subscribeWithSelector } from "zustand/middleware"
import { parseDiagramType } from "@/utils"
import * as Y from "yjs"
import { getDiagramMetadata, STORE_ORIGIN } from "@/sync/ydoc"
import { UMLDiagramType } from "@/types"
import { ApollonMode, ApollonView } from "@/typings"
import { IPoint } from "@/edges/Connection"
import { DEFAULT_LABELS, type ApollonLabels } from "@/i18n/labels"

/**
 * Which edge-routing engine drives the canvas. `central` (default) runs one
 * synchronous solver over all edges in a single pre-paint pass. `per-edge` is
 * the original cascade — each edge routes itself and publishes into a shared
 * store, settling over a few frames — kept as a kill switch; the two are proven
 * byte-identical by the parity gate across every diagram type.
 */
export type EdgeRoutingMode = "central" | "per-edge"

/**
 * An edge whose route is being dragged (bend or endpoint) right now, published
 * so the central solver can route every OTHER edge around the live preview —
 * the `central`-mode equivalent of the per-edge path publishing its in-progress
 * `renderPoints` into the geometry store. `null` whenever nothing is dragging.
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
  edgeRouting: EdgeRoutingMode
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
  setMode: (mode: ApollonMode) => void
  setView: (view: ApollonView) => void
  setAvailableViews: (availableViews: ApollonView[]) => void
  setReadonly: (readonly: boolean) => void
  setEdgeRouting: (edgeRouting: EdgeRoutingMode) => void
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
  edgeRouting: EdgeRoutingMode
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
  edgeRouting: "central",
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

        setEdgeRouting: (edgeRouting) => {
          set({ edgeRouting }, undefined, "setEdgeRouting")
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
