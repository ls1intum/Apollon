import { usePopoverStore } from "@/store/context"
import { useMetadataStore } from "@/store"
import { ApollonMode } from "@/typings"
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
  const { mode, readonly } = useMetadataStore(
    useShallow((state) => ({
      mode: state.mode,
      readonly: state.readonly,
    }))
  )
  const { setPopOverElementId } = usePopoverStore(
    useShallow((state) => ({
      setPopOverElementId: state.setPopOverElementId,
    }))
  )
  const canOpenAssessmentPopover = mode === ApollonMode.Assessment && !readonly
  const canOpenPopover = isDiagramModifiable || canOpenAssessmentPopover

  const onBeforeDelete: OnBeforeDelete = () => {
    return new Promise((resolve) => resolve(isDiagramModifiable))
  }

  const onNodeDoubleClick: NodeMouseHandler<Node> = (_event, node) => {
    if (!canOpenPopover) {
      return
    }
    setPopOverElementId(node.id)
  }

  const onEdgeDoubleClick: EdgeMouseHandler<Edge> = (_event, edge) => {
    if (!canOpenPopover) {
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
