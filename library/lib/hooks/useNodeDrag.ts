import { useCallback } from "react"
import { type OnNodeDrag, type Node } from "@xyflow/react"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { calculateAlignmentGuides } from "@/utils/alignmentUtils"
import { useAlignmentGuidesStore } from "@/store/context"

export const useNodeDrag = () => {
  const { nodes } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
    }))
  )

  const { setGuides } = useAlignmentGuidesStore(
    useShallow((state) => ({
      setGuides: state.setGuides,
    }))
  )

  const onNodeDrag: OnNodeDrag<Node> = useCallback(
    (_event, draggedNode) => {
      // Calculate alignment guides based on current position
      const guides = calculateAlignmentGuides(draggedNode, nodes)

      // Update guides in store for rendering
      setGuides(guides)
    },
    [nodes, setGuides]
  )

  return onNodeDrag
}
