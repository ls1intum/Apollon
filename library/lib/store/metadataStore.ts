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
import { DISABLED_TAG_CONFIG, type TagConfig } from "@/utils/tagUtils"

/**
 * An edge whose route is being dragged right now. Bend geometry is authoritative;
 * endpoint geometry can instead describe the exact edge pointer-up will commit so
 * the central solver generates the whole live route set under committed constraints.
 * `null` whenever nothing is dragging.
 */
export type LiveEdgeOverride = {
  edgeId: string
  points: IPoint[]
  /** Predicted committed edge semantics during an endpoint drag. Bend drags may
   * omit this because source/target/anchors do not change. */
  edge?: Edge
  /**
   * Endpoint reconnects must be routed under the exact constraints the predicted
   * edge will have after pointer-up. In that mode `points` is only an immediate
   * interaction fallback; the central solver generates the authoritative preview.
   * Bend drags omit this and keep their authored polyline byte-for-byte.
   */
  strategy?: "authoritative" | "predicted"
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
  /** Tool toggle: clicks/taps add or remove elements — the touch path to a multi-selection. */
  multiSelectionMode: boolean
  /** Whether the editor answers `APOLLON_SHORTCUTS` at all. */
  keyboardShortcuts: boolean
  /** User-facing strings for the editor's own chrome; host-overridable for i18n. */
  labels: ApollonLabels
  /** Element-tag authoring config; disabled until a host opts in. */
  tagConfig: TagConfig
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
  setMultiSelectionMode: (multiSelectionMode: boolean) => void
  setKeyboardShortcuts: (keyboardShortcuts: boolean) => void
  setLabels: (labels: ApollonLabels) => void
  setTagConfig: (tagConfig: TagConfig) => void
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
  multiSelectionMode: boolean
  keyboardShortcuts: boolean
  labels: ApollonLabels
  tagConfig: TagConfig
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
  multiSelectionMode: false,
  keyboardShortcuts: true,
  labels: DEFAULT_LABELS,
  tagConfig: DISABLED_TAG_CONFIG,
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

        setMultiSelectionMode: (multiSelectionMode: boolean) => {
          set({ multiSelectionMode }, undefined, "setMultiSelectionMode")
        },
        setKeyboardShortcuts: (keyboardShortcuts: boolean) => {
          set({ keyboardShortcuts }, undefined, "setKeyboardShortcuts")
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

        setTagConfig: (tagConfig) => {
          // Skip the write when value-equal — a host passing an inline
          // `tags={{…}}` literal produces a fresh object every render.
          set(
            (s) => {
              const cur = s.tagConfig
              const same =
                cur.enabled === tagConfig.enabled &&
                cur.allowCreate === tagConfig.allowCreate &&
                cur.available.length === tagConfig.available.length &&
                cur.available.every((v, i) => v === tagConfig.available[i])
              return same ? s : { tagConfig }
            },
            undefined,
            "setTagConfig"
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
