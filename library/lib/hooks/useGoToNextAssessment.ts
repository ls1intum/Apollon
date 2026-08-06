import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { usePopoverStore } from "@/store/context"
import { useMemo } from "react"
import { useReactFlow } from "@xyflow/react"

export type AssessmentNavigationDirection = "previous" | "next"

/** Shared navigation state for the assessment popover footer. */
export const useAssessmentNavigation = (elementId: string) => {
  const { setCenter, getZoom } = useReactFlow()
  const { nodes, edges, setNodes, setEdges, setSelectedElementsId } =
    useDiagramStore(
      useShallow((state) => ({
        nodes: state.nodes,
        edges: state.edges,
        setNodes: state.setNodes,
        setEdges: state.setEdges,
        setSelectedElementsId: state.setSelectedElementsId,
      }))
    )
  const setPopOverElementId = usePopoverStore(
    useShallow((state) => state.setPopOverElementId)
  )

  const elements = useMemo(() => [...nodes, ...edges], [nodes, edges])
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
