import { useCallback } from "react"
import { useDiagramStore, useDiagramStoreApi } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { sortNodesTopologically } from "@/utils"
import { log } from "../logger"
import {
  ClipboardData,
  createClipboardData,
  getAllNodesToInclude,
  getEdgesToRemove,
  materializeClipboardData,
} from "@/utils/copyPasteUtils"

export const useSelectionForCopyPaste = () => {
  const {
    nodes,
    edges,
    selectedElementIds,
    setSelectedElementsId,
    setNodes,
    setEdges,
  } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      selectedElementIds: state.selectedElementIds,
      setSelectedElementsId: state.setSelectedElementsId,
      setNodes: state.setNodes,
      setEdges: state.setEdges,
    }))
  )
  // Read live state where a mutation must build on the previous one within a
  // single tick (rapid paste/duplicate), before React has re-rendered.
  const storeApi = useDiagramStoreApi()

  const hasSelectedElements = useCallback(() => {
    return selectedElementIds.length > 0
  }, [selectedElementIds])

  const selectAll = useCallback(() => {
    const allElementIds = [
      ...nodes.map((node) => node.id),
      ...edges.map((edge) => edge.id),
    ]

    setSelectedElementsId(allElementIds)
    setNodes(nodes.map((node) => ({ ...node, selected: true })))
    setEdges(edges.map((edge) => ({ ...edge, selected: true })))
  }, [nodes, edges, setSelectedElementsId, setNodes, setEdges])

  const clearSelection = useCallback(() => {
    setSelectedElementsId([])
    setNodes(nodes.map((node) => ({ ...node, selected: false })))
    setEdges(edges.map((edge) => ({ ...edge, selected: false })))
  }, [nodes, edges, setSelectedElementsId, setNodes, setEdges])

  const copySelectedElements = useCallback(async () => {
    if (selectedElementIds.length === 0) {
      return false
    }

    const clipboardData = createClipboardData(selectedElementIds, nodes, edges)

    try {
      const jsonString = JSON.stringify(clipboardData)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(jsonString)
        return true
      }
    } catch (error) {
      log.error("Failed to copy to clipboard:", error as Error)
      return false
    }

    return false
  }, [selectedElementIds, nodes, edges])

  /**
   * Materialize clipboard data with fresh ids and an offset, insert it, and
   * move the selection onto the inserted elements. Shared tail of paste and
   * duplicate.
   */
  const insertClipboardData = useCallback(
    (clipboardData: ClipboardData, offsetMultiplier: number) => {
      const materialized = materializeClipboardData(
        clipboardData,
        offsetMultiplier
      )

      // Live state, not the render closure: a second paste in the same tick must
      // append to the first paste's result, not to the pre-paste diagram.
      const { nodes: currentNodes, edges: currentEdges } = storeApi.getState()

      const updatedExistingNodes = currentNodes.map((node) => ({
        ...node,
        selected: false,
      }))

      const updatedExistingEdges = currentEdges.map((edge) => ({
        ...edge,
        selected: false,
      }))

      const allUpdatedNodes = sortNodesTopologically([
        ...updatedExistingNodes,
        ...materialized.nodes,
      ])
      const allUpdatedEdges = [...updatedExistingEdges, ...materialized.edges]

      setNodes(allUpdatedNodes)
      setEdges(allUpdatedEdges)

      setSelectedElementsId(materialized.newElementIds)
    },
    [storeApi, setNodes, setEdges, setSelectedElementsId]
  )

  const pasteElements = useCallback(
    async (pasteCount: number = 1) => {
      try {
        let text: string
        if (navigator.clipboard && window.isSecureContext) {
          text = await navigator.clipboard.readText()
        } else {
          return false
        }

        const clipboardData = JSON.parse(text) as ClipboardData

        if (
          !clipboardData ||
          !Array.isArray(clipboardData.nodes) ||
          !Array.isArray(clipboardData.edges)
        ) {
          return false
        }

        insertClipboardData(clipboardData, pasteCount)

        return true
      } catch (error) {
        log.error("Failed to paste from clipboard:", error as Error)
        return false
      }
    },
    [insertClipboardData]
  )

  /**
   * Clone the current selection beside itself — no clipboard involved, so it
   * works in non-secure contexts and never clobbers what the user has copied.
   */
  const duplicateSelectedElements = useCallback(() => {
    // Live state so a second duplicate in the same tick clones the first's
    // result — and inserts against it — rather than the pre-duplicate diagram.
    const {
      nodes: currentNodes,
      edges: currentEdges,
      selectedElementIds: currentSelection,
    } = storeApi.getState()
    if (currentSelection.length === 0) {
      return false
    }

    const clipboardData = createClipboardData(
      currentSelection,
      currentNodes,
      currentEdges
    )
    insertClipboardData(clipboardData, 1)

    return true
  }, [storeApi, insertClipboardData])

  const cutSelectedElements = useCallback(async () => {
    if (selectedElementIds.length === 0) {
      return false
    }

    const clipboardData = createClipboardData(selectedElementIds, nodes, edges)

    try {
      const jsonString = JSON.stringify(clipboardData)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(jsonString)
      } else {
        return false
      }
    } catch (error) {
      log.error("Failed to copy to clipboard:", error as Error)
      return false
    }

    const allNodesToCut = getAllNodesToInclude(selectedElementIds, nodes)
    const expandedNodeIds = allNodesToCut.map((node) => node.id)
    const edgeIdsToRemove = getEdgesToRemove(
      selectedElementIds,
      expandedNodeIds,
      edges
    )

    const remainingNodes = nodes.filter(
      (node) => !expandedNodeIds.includes(node.id)
    )
    const remainingEdges = edges.filter((edge) => !edgeIdsToRemove.has(edge.id))

    setNodes(remainingNodes)
    setEdges(remainingEdges)
    setSelectedElementsId([])

    return true
  }, [
    selectedElementIds,
    nodes,
    edges,
    setNodes,
    setEdges,
    setSelectedElementsId,
  ])

  return {
    hasSelectedElements,
    selectAll,
    clearSelection,
    copySelectedElements,
    pasteElements,
    duplicateSelectedElements,
    cutSelectedElements,
  }
}
