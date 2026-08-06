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
import { isElementInOverlay } from "@/keyboard"
import { useCallback } from "react"

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

  const onBeforeDelete: OnBeforeDelete = useCallback(() => {
    // Keep the deletion funnel defensive for toolbar/API calls as well as the
    // scoped keyboard path: an overlay over the canvas owns the interaction.
    if (isElementInOverlay(document.activeElement)) {
      return Promise.resolve(false)
    }
    return Promise.resolve(isDiagramModifiable)
  }, [isDiagramModifiable])

  const onNodeDoubleClick: NodeMouseHandler<Node> = useCallback(
    (_event, node) => {
      // Assessment has no separate selection/editing step: a single click
      // opens its feedback editor. Keep double-click for editable diagrams,
      // where the first click still belongs to normal React Flow selection.
      if (!canOpenPopover || canOpenAssessmentPopover) return
      setPopOverElementId(node.id)
    },
    [canOpenAssessmentPopover, canOpenPopover, setPopOverElementId]
  )

  const onEdgeDoubleClick: EdgeMouseHandler<Edge> = useCallback(
    (_event, edge) => {
      if (!canOpenPopover || canOpenAssessmentPopover) return
      setPopOverElementId(edge.id)
    },
    [canOpenAssessmentPopover, canOpenPopover, setPopOverElementId]
  )

  const onNodeClick: NodeMouseHandler<Node> = useCallback(
    (_event, node) => {
      if (!canOpenAssessmentPopover) return
      setPopOverElementId(node.id)
    },
    [canOpenAssessmentPopover, setPopOverElementId]
  )

  const onEdgeClick: EdgeMouseHandler<Edge> = useCallback(
    (_event, edge) => {
      if (!canOpenAssessmentPopover) return
      setPopOverElementId(edge.id)
    },
    [canOpenAssessmentPopover, setPopOverElementId]
  )
  return {
    onBeforeDelete,
    onNodeClick,
    onEdgeClick,
    onNodeDoubleClick,
    onEdgeDoubleClick,
  }
}
