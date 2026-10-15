import {
  useAssessmentSelectionStore,
  useDiagramStore,
  useMetadataStore,
} from "@/store"
import { useShallow } from "zustand/shallow"
import { ApollonMode } from "@/typings"
import { useCallback, useEffect } from "react"

export const usePaneClicked = () => {
  const { mode, readonly } = useMetadataStore(
    useShallow((state) => ({
      mode: state.mode,
      readonly: state.readonly,
    }))
  )
  const { nodes, setLocalSelection, setNodes } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
      setLocalSelection: state.setLocalSelection,
      setNodes: state.setNodes,
    }))
  )

  const {
    isAssessmentSelectionMode,
    setAssessmentSelectionMode,
    clearSelection,
  } = useAssessmentSelectionStore(
    useShallow((state) => ({
      isAssessmentSelectionMode: state.isAssessmentSelectionMode,
      setAssessmentSelectionMode: state.setAssessmentSelectionMode,
      clearSelection: state.clearSelection,
    }))
  )

  // Auto-enable assessment selection mode when in readonly assessment mode
  useEffect(() => {
    const shouldEnableAssessmentMode =
      mode === ApollonMode.Assessment && readonly
    if (shouldEnableAssessmentMode !== isAssessmentSelectionMode) {
      setAssessmentSelectionMode(shouldEnableAssessmentMode)
    }
  }, [mode, readonly, isAssessmentSelectionMode, setAssessmentSelectionMode])

  const onPaneClicked = useCallback(() => {
    if (isAssessmentSelectionMode) {
      clearSelection()
    }
    setLocalSelection([])
    const updatedExistingNodes = nodes.map((node) => ({
      ...node,
      selected: false,
      dragging: false,
    }))

    setNodes(updatedExistingNodes, { persist: false })
  }, [
    isAssessmentSelectionMode,
    clearSelection,
    setLocalSelection,
    nodes,
    setNodes,
  ])

  return { onPaneClicked }
}
