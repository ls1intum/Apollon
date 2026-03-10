import { createContext, useContext } from "react"
import { StoreApi, useStore } from "zustand"
import { DiagramStore } from "./diagramStore"
import { MetadataStore } from "./metadataStore"
import { PopoverStore } from "./popoverStore"
import { AssessmentSelectionStore } from "./assessmentSelectionStore"
import { AlignmentGuidesStore } from "./alignmentGuidesStore"

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

// Custom hooks for components
export const useDiagramStore = <T>(selector: (state: DiagramStore) => T): T => {
  const store = useContext(DiagramStoreContext)
  if (!store) throw new Error("DiagramStoreContext not provided")
  return useStore(store, selector)
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
