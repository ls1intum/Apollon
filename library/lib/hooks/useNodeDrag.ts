import { useCallback } from "react"
import { type OnNodeDrag, type Node } from "@xyflow/react"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { calculateAlignmentGuides } from "@/utils/alignmentUtils"
import { useAlignmentGuidesStore } from "@/store/context"

// Visual-only radius for showing alignment guide lines. Nodes don't snap to
// these — the grid step does the alignment work. Guides are advisory only.
const ALIGNMENT_GUIDE_DISPLAY_PX = 6

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
      // Alignment guides are visual-only — they show users that nodes line
      // up, but no snap pulls the node onto them.
      const alignmentGuides = calculateAlignmentGuides(
        draggedNode,
        nodes,
        ALIGNMENT_GUIDE_DISPLAY_PX
      )
      setGuides(alignmentGuides)
    },
    [nodes, setGuides]
  )

  return onNodeDrag
}
