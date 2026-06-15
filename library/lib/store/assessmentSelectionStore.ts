import { create, StoreApi, UseBoundStore } from "zustand"
import { devtools, subscribeWithSelector } from "zustand/middleware"

export type AssessmentSelectionStore = {
  // Currently selected elements for assessment
  selectedElementIds: string[]
  // Highlighted element (on hover)
  highlightedElementId: string | null
  // Whether assessment selection mode is active
  isAssessmentSelectionMode: boolean
  // Host-driven highlight overlays: element id -> CSS color. Used by hosting
  // apps (e.g. assessment "missing feedback" or Athena suggestion overlays)
  // to tint specific nodes / edges / class members. This is an ephemeral view
  // concern — it is NOT part of the model, never serialized, and never shared
  // with collaborators. It is the v4 replacement for the v3
  // `UMLModelElement.highlight` field + `ApollonEditor.select()` API.
  highlightedElements: Record<string, string>

  // Actions
  setAssessmentSelectionMode: (isActive: boolean) => void
  selectElement: (elementId: string) => void
  selectMultipleElements: (elementIds: string[]) => void
  clearSelection: () => void
  setHighlightedElement: (elementId: string | null) => void
  setElementHighlights: (highlights: Record<string, string>) => void
  isElementSelected: (elementId: string) => boolean
  isElementHighlighted: (elementId: string) => boolean
  reset: () => void
}

type InitialAssessmentSelectionState = {
  selectedElementIds: string[]
  highlightedElementId: string | null
  isAssessmentSelectionMode: boolean
  highlightedElements: Record<string, string>
}

const initialAssessmentSelectionState: InitialAssessmentSelectionState = {
  selectedElementIds: [],
  highlightedElementId: null,
  isAssessmentSelectionMode: false,
  highlightedElements: {},
}

export const createAssessmentSelectionStore = (): UseBoundStore<
  StoreApi<AssessmentSelectionStore>
> =>
  create<AssessmentSelectionStore>()(
    devtools(
      subscribeWithSelector((set, get) => ({
        ...initialAssessmentSelectionState,

        setAssessmentSelectionMode: (isActive: boolean) => {
          set(
            { isAssessmentSelectionMode: isActive },
            undefined,
            "setAssessmentSelectionMode"
          )
          // Clear selection when disabling assessment mode
          if (!isActive) {
            set(
              { selectedElementIds: [], highlightedElementId: null },
              undefined,
              "clearSelectionOnDisable"
            )
          }
        },

        selectElement: (elementId: string) => {
          set({ selectedElementIds: [elementId] }, undefined, "selectElement")
        },

        selectMultipleElements: (elementIds: string[]) => {
          set(
            { selectedElementIds: elementIds },
            undefined,
            "selectMultipleElements"
          )
        },

        clearSelection: () => {
          set({ selectedElementIds: [] }, undefined, "clearSelection")
        },

        setHighlightedElement: (elementId: string | null) => {
          set(
            { highlightedElementId: elementId },
            undefined,
            "setHighlightedElement"
          )
        },

        setElementHighlights: (highlights: Record<string, string>) => {
          set(
            { highlightedElements: highlights },
            undefined,
            "setElementHighlights"
          )
        },

        isElementSelected: (elementId: string) => {
          return get().selectedElementIds.includes(elementId)
        },

        isElementHighlighted: (elementId: string) => {
          return get().highlightedElementId === elementId
        },

        reset: () => {
          set(initialAssessmentSelectionState, undefined, "reset")
        },
      })),
      { name: "AssessmentSelectionStore", enabled: true }
    )
  )
