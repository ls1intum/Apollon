import * as Y from "yjs"
import { StoreApi } from "zustand"
import { createDiagramStore, DiagramStore } from "@/store/diagramStore"
import { createMetadataStore, MetadataStore } from "@/store/metadataStore"
import { createPopoverStore, PopoverStore } from "@/store/popoverStore"
import {
  createAssessmentSelectionStore,
  AssessmentSelectionStore,
} from "@/store/assessmentSelectionStore"
import {
  createAlignmentGuidesStore,
  AlignmentGuidesStore,
} from "@/store/alignmentGuidesStore"
import {
  createEdgeGeometryStore,
  EdgeGeometryStore,
} from "@/store/edgeGeometryStore"
import { createOverlayStore, OverlayStore } from "../overlay/overlayStore"

/**
 * The complete set of per-editor zustand stores. One instance is created per
 * `ApollonEditor` (and one per headless SVG export). Bundling them lets both
 * mount sites — the live editor and the off-screen exporter — share a single
 * provider stack (`ApollonRoot`) instead of duplicating it.
 */
export interface ApollonStores {
  diagramStore: StoreApi<DiagramStore>
  metadataStore: StoreApi<MetadataStore>
  popoverStore: StoreApi<PopoverStore>
  assessmentSelectionStore: StoreApi<AssessmentSelectionStore>
  alignmentGuidesStore: StoreApi<AlignmentGuidesStore>
  edgeGeometryStore: StoreApi<EdgeGeometryStore>
  overlayStore: StoreApi<OverlayStore>
}

/**
 * Build every per-editor store in the one order that is load-bearing:
 * `metadataStore` closes over `() => diagramStore.previewMode`, so the diagram
 * store must exist first. This factory is construct-only — it wires no undo
 * manager and enables no collaboration; callers opt into those after building
 * (e.g. the live editor calls `initializeUndoManager()` in Modelling mode; the
 * headless export path never does, keeping the rendered SVG deterministic).
 */
export function createApollonStores(ydoc: Y.Doc): ApollonStores {
  const diagramStore = createDiagramStore(ydoc)
  const metadataStore = createMetadataStore(
    ydoc,
    () => diagramStore.getState().previewMode
  )
  const popoverStore = createPopoverStore()
  const assessmentSelectionStore = createAssessmentSelectionStore()
  const alignmentGuidesStore = createAlignmentGuidesStore()
  const edgeGeometryStore = createEdgeGeometryStore()
  const overlayStore = createOverlayStore()

  return {
    diagramStore,
    metadataStore,
    popoverStore,
    assessmentSelectionStore,
    alignmentGuidesStore,
    edgeGeometryStore,
    overlayStore,
  }
}
