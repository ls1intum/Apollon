import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { usePopoverStore, useAssessmentSelectionStore } from "@/store/context"
import { useMemo } from "react"
import { useReactFlow } from "@xyflow/react"
import { assessedIdsFor, hasAssessmentToShow } from "@/utils/assessmentPresence"

export type AssessmentNavigationDirection = "previous" | "next"

/** Shared navigation state for the assessment popover footer. */
export const useAssessmentNavigation = (elementId: string) => {
  const { setCenter, getZoom } = useReactFlow()
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    setSelectedElementsId,
    getAssessment,
  } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      setNodes: state.setNodes,
      setEdges: state.setEdges,
      setSelectedElementsId: state.setSelectedElementsId,
      getAssessment: state.getAssessment,
    }))
  )
  const selectMultipleElements = useAssessmentSelectionStore(
    useShallow((state) => state.selectMultipleElements)
  )
  const setPopOverElementId = usePopoverStore(
    useShallow((state) => state.setPopOverElementId)
  )

  // Only assessed elements are worth stepping through. Walking every node and
  // edge meant "next assessment" mostly landed on things nobody had graded, and
  // the reader had to keep pressing to find the next one that said anything.
  // The element the reader is on stays in the list even when it is still
  // unassessed, so a tutor writing feedback never loses their place mid-edit.
  const elements = useMemo(() => {
    const all = [...nodes, ...edges]
    return all.filter((element) => {
      if (element.id === elementId) return true
      return hasAssessmentToShow(element.id, nodes, getAssessment)
    })
  }, [nodes, edges, elementId, getAssessment])
  const currentIndex = elements.findIndex((element) => element.id === elementId)
  const total = elements.length

  const navigate = (direction: AssessmentNavigationDirection) => {
    if (total === 0 || currentIndex < 0) return
    const offset = direction === "next" ? 1 : -1
    const nextIndex = (currentIndex + offset + total) % total
    const nextElement = elements[nextIndex]

    const focusNodeIds =
      "source" in nextElement
        ? [nextElement.source, nextElement.target]
        : [nextElement.id]
    const focusNodes = focusNodeIds
      .map((id) => nodes.find((node) => node.id === id))
      .filter((node): node is (typeof nodes)[number] => node !== undefined)
    if (focusNodes.length > 0) {
      const center = focusNodes.reduce(
        (accumulator, node) => ({
          x: accumulator.x + node.position.x + (node.width ?? 0) / 2,
          y: accumulator.y + node.position.y + (node.height ?? 0) / 2,
        }),
        { x: 0, y: 0 }
      )
      const divisor = focusNodes.length
      setCenter(center.x / divisor, center.y / divisor, {
        duration: 220,
        zoom: getZoom(),
      })
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        selected: node.id === nextElement.id,
      }))
    )
    setEdges((currentEdges) =>
      currentEdges.map((edge) => ({
        ...edge,
        selected: edge.id === nextElement.id,
      }))
    )
    setSelectedElementsId([nextElement.id])
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
