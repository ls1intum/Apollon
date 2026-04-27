import { usePopoverStore } from "@/store/context"
import {
  NodeMouseHandler,
  OnBeforeDelete,
  type Node,
  type Edge,
  EdgeMouseHandler,
} from "@xyflow/react"
import { useShallow } from "zustand/shallow"
import { useDiagramModifiable } from "./useDiagramModifiable"

export const useElementInteractions = () => {
  const isDiagramModifiable = useDiagramModifiable()
  const { setPopOverElementId } = usePopoverStore(
    useShallow((state) => ({
      setPopOverElementId: state.setPopOverElementId,
    }))
  )

  const onBeforeDelete: OnBeforeDelete = () => {
    return new Promise((resolve) => resolve(isDiagramModifiable))
  }

  const onNodeDoubleClick: NodeMouseHandler<Node> = (_event, node) => {
    if (!isDiagramModifiable) {
      return
    }
    setPopOverElementId(node.id)
  }

  const onEdgeDoubleClick: EdgeMouseHandler<Edge> = (_event, edge) => {
    if (!isDiagramModifiable) {
      return
    }
    setPopOverElementId(edge.id)
  }
  return {
    onBeforeDelete,
    onNodeDoubleClick,
    onEdgeDoubleClick,
  }
}
