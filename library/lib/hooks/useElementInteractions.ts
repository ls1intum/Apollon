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
    // React Flow's Delete listener is document-level, so a Delete pressed while
    // focus is in a dialog or menu over the canvas would otherwise remove the
    // selection behind it. Block that here — the one place every RF deletion
    // funnels through — the same way the editor's own shortcuts stand down.
    if (isElementInOverlay(document.activeElement)) {
      return Promise.resolve(false)
    }
    return Promise.resolve(isDiagramModifiable)
  }, [isDiagramModifiable])

  const onNodeDoubleClick: NodeMouseHandler<Node> = useCallback(
    (_event, node) => {
      if (!canOpenPopover) return
      setPopOverElementId(node.id)
    },
    [canOpenPopover, setPopOverElementId]
  )

  const onEdgeDoubleClick: EdgeMouseHandler<Edge> = useCallback(
    (_event, edge) => {
      if (!canOpenPopover) return
      setPopOverElementId(edge.id)
    },
    [canOpenPopover, setPopOverElementId]
  )
  return {
    onBeforeDelete,
    onNodeDoubleClick,
    onEdgeDoubleClick,
  }
}
