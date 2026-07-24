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
    // React Flow's Delete listener is document-level, so a Delete pressed while
    // focus is in a dialog or menu over the canvas would otherwise remove the
    // selection behind it. Block that here — the one place every RF deletion
    // funnels through — the same way the editor's own shortcuts stand down.
    if (isElementInOverlay(document.activeElement)) {
      return Promise.resolve(false)
    }
    return Promise.resolve(isDiagramModifiable)
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
