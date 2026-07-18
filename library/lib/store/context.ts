import { createContext, useContext } from "react"
import { StoreApi, useStore } from "zustand"
import { DiagramStore } from "./diagramStore"
import { MetadataStore } from "./metadataStore"
import { PopoverStore } from "./popoverStore"
import { AssessmentSelectionStore } from "./assessmentSelectionStore"
import { AlignmentGuidesStore } from "./alignmentGuidesStore"
import { EdgeGeometryStore } from "./edgeGeometryStore"
import { OverlayStore } from "../overlay/overlayStore"

export const DiagramStoreContext = createContext<StoreApi<DiagramStore> | null>(
  null
)

export const MetadataStoreContext =
  createContext<StoreApi<MetadataStore> | null>(null)

export const PopoverStoreContext = createContext<StoreApi<PopoverStore> | null>(
  null
)

export const AssessmentSelectionStoreContext =
  createContext<StoreApi<AssessmentSelectionStore> | null>(null)

export const AlignmentGuidesStoreContext =
  createContext<StoreApi<AlignmentGuidesStore> | null>(null)

export const EdgeGeometryStoreContext =
  createContext<StoreApi<EdgeGeometryStore> | null>(null)

export const OverlayStoreContext = createContext<StoreApi<OverlayStore> | null>(
  null
)

// Custom hooks for components
export const useDiagramStore = <T>(selector: (state: DiagramStore) => T): T => {
  const store = useContext(DiagramStoreContext)
  if (!store) throw new Error("DiagramStoreContext not provided")
  return useStore(store, selector)
}

/**
 * The raw diagram store, for reading `getState()` inside a callback that must
 * see the LATEST state rather than the values captured when it was created —
 * e.g. two rapid pastes, where the second must build on the first's insert.
 */
export const useDiagramStoreApi = (): StoreApi<DiagramStore> => {
  const store = useContext(DiagramStoreContext)
  if (!store) throw new Error("DiagramStoreContext not provided")
  return store
}

export const useMetadataStore = <T>(
  selector: (state: MetadataStore) => T
): T => {
  const store = useContext(MetadataStoreContext)
  if (!store) throw new Error("MetadataStoreContext not provided")
  return useStore(store, selector)
}

export const usePopoverStore = <T>(selector: (state: PopoverStore) => T): T => {
  const store = useContext(PopoverStoreContext)
  if (!store) throw new Error("PopoverStoreContext not provided")
  return useStore(store, selector)
}

export const useAssessmentSelectionStore = <T>(
  selector: (state: AssessmentSelectionStore) => T
): T => {
  const store = useContext(AssessmentSelectionStoreContext)
  if (!store) throw new Error("AssessmentSelectionStoreContext not provided")
  return useStore(store, selector)
}

export const useAlignmentGuidesStore = <T>(
  selector: (state: AlignmentGuidesStore) => T
): T => {
  const store = useContext(AlignmentGuidesStoreContext)
  if (!store) throw new Error("AlignmentGuidesStoreContext not provided")
  return useStore(store, selector)
}

export const useEdgeGeometryStore = <T>(
  selector: (state: EdgeGeometryStore) => T
): T => {
  const store = useContext(EdgeGeometryStoreContext)
  if (!store) throw new Error("EdgeGeometryStoreContext not provided")
  return useStore(store, selector)
}

export const useOverlayStore = <T>(selector: (state: OverlayStore) => T): T => {
  const store = useContext(OverlayStoreContext)
  if (!store) throw new Error("OverlayStoreContext not provided")
  return useStore(store, selector)
}
