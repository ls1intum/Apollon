import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import {
  usePopoverStore,
  useAssessmentSelectionStore,
  useEdgeGeometryStoreApi,
  useMetadataStore,
} from "@/store/context"
import { useMemo } from "react"
import { useReactFlow } from "@xyflow/react"
import { assessedIdsFor, hasAssessmentToShow } from "@/utils/assessmentPresence"
import { ApollonMode } from "@/typings"
import { getAssessmentElementCenter } from "@/utils/assessmentFocus"

export type AssessmentNavigationDirection = "previous" | "next"

/** Shared navigation state for the assessment popover footer. */
export const useAssessmentNavigation = (elementId: string) => {
  const { setCenter, getZoom } = useReactFlow()
  const edgeGeometryStore = useEdgeGeometryStoreApi()
  const { nodes, edges, setLocalSelection, getAssessment } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      setLocalSelection: state.setLocalSelection,
      getAssessment: state.getAssessment,
    }))
  )
  const selectMultipleElements = useAssessmentSelectionStore(
    useShallow((state) => state.selectMultipleElements)
  )
  const setPopOverElementId = usePopoverStore(
    useShallow((state) => state.setPopOverElementId)
  )
  const { diagramMode, readonly } = useMetadataStore(
    useShallow((state) => ({
      diagramMode: state.mode,
      readonly: state.readonly,
    }))
  )
  const isGivingFeedback = diagramMode === ApollonMode.Assessment && !readonly

  // What is worth stepping through depends on who is stepping — the same split
  // `PopoverManager` makes when deciding whether to open a popover.
  //
  // Grading: every element is a target, including untouched ones — those are
  // precisely the ones still needing feedback.
  // Reading: an ungraded element has nothing to show, so stepping onto it is a
  // dead end. Assessed elements only, plus the current one so the reader keeps
  // their place.
  const elements = useMemo(() => {
    const all = [...nodes, ...edges]
    if (isGivingFeedback) return all
    return all.filter((element) => {
      if (element.id === elementId) return true
      return hasAssessmentToShow(element.id, nodes, getAssessment)
    })
  }, [nodes, edges, elementId, getAssessment, isGivingFeedback])
  const currentIndex = elements.findIndex((element) => element.id === elementId)
  const total = elements.length

  const navigate = (direction: AssessmentNavigationDirection) => {
    if (total === 0 || currentIndex < 0) return
    const offset = direction === "next" ? 1 : -1
    const nextIndex = (currentIndex + offset + total) % total
    const nextElement = elements[nextIndex]

    const center = getAssessmentElementCenter(
      nextElement,
      nodes,
      edgeGeometryStore.getState()
    )
    if (center) {
      setCenter(center.x, center.y, {
        duration: 220,
        zoom: getZoom(),
      })
    }

    setLocalSelection([nextElement.id])
    // The highlight is painted from the assessment store, not from React Flow's
    // selection — without this the mark stayed on the element you came from
    // while the popover showed the next one.
    selectMultipleElements(assessedIdsFor(nextElement.id, nodes))
    setPopOverElementId(nextElement.id)
  }

  return {
    currentIndex,
    total,
    canNavigate: currentIndex >= 0 && total > 1,
    navigate,
    goToNext: () => navigate("next"),
  }
}

export const useGoToNextAssessment = (elementId: string) => {
  return useAssessmentNavigation(elementId).goToNext
}
