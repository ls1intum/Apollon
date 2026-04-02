import { useCallback } from "react"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { generateUUID, sortNodesTopologically } from "@/utils"
import type { Node } from "@xyflow/react"
import { log } from "../logger"
import {
  ClipboardData,
  createClipboardData,
  createNewNodeDataWithNewIds,
  getAllNodesToInclude,
  getEdgesToRemove,
} from "@/utils/copyPasteUtils"
import { CANVAS } from "@/constants"

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

        const nodeIdMap = new Map<string, string>()
        const newElementIds: string[] = []
        const progressiveOffset = CANVAS.PASTE_OFFSET_PX * pasteCount

        clipboardData.nodes.forEach((node) => {
          const newId = generateUUID()
          nodeIdMap.set(node.id, newId)
          newElementIds.push(newId)
        })

        const sortedNodes = sortNodesTopologically(clipboardData.nodes)
        const nodePositions = new Map<string, { x: number; y: number }>()

        const pastedNodes = sortedNodes.map((node: Node) => {
          const newId = nodeIdMap.get(node.id)!

          const newNodeData = createNewNodeDataWithNewIds(node.data)

          if (node.parentId && nodeIdMap.has(node.parentId)) {
            const newParentId = nodeIdMap.get(node.parentId)!
            const relation = clipboardData.parentChildRelations?.find(
              (r) => r.childId === node.id && r.parentId === node.parentId
            )

            if (relation) {
              const parentNewPosition = nodePositions.get(node.parentId)

              if (parentNewPosition) {
                const newPosition = {
                  x: node.position.x + CANVAS.PASTE_OFFSET_PX,
                  y: node.position.y + CANVAS.PASTE_OFFSET_PX,
                }

                nodePositions.set(node.id, newPosition)

                return {
                  ...node,
                  id: newId,
                  parentId: newParentId,
                  position: newPosition,
                  selected: true,
                  data: newNodeData,
                }
              }
            }
          }

          const newPosition = {
            x: node.position.x + progressiveOffset,
            y: node.position.y + progressiveOffset,
          }

          nodePositions.set(node.id, newPosition)

          return {
            ...node,
            id: newId,
            position: newPosition,
            selected: true,
            data: newNodeData,
          }
        })

        const pastedEdges = clipboardData.edges
          .filter((edge) => {
            return nodeIdMap.has(edge.source) && nodeIdMap.has(edge.target)
          })

          .map((edge) => {
            const newId = generateUUID()
            newElementIds.push(newId)
            return {
              ...edge,
              id: newId,
              source: nodeIdMap.get(edge.source)!,
              target: nodeIdMap.get(edge.target)!,
              selected: true,
              data: {
                ...edge.data,
                points: Array.isArray(edge.data?.points)
                  ? edge.data.points.map((point) => ({
                      x: point.x + progressiveOffset,
                      y: point.y + progressiveOffset,
                    }))
                  : undefined,
              },
            }
          })

        const updatedExistingNodes = nodes.map((node) => ({
          ...node,
          selected: false,
        }))

        const updatedExistingEdges = edges.map((edge) => ({
          ...edge,
          selected: false,
        }))

        const allUpdatedNodes = sortNodesTopologically([
          ...updatedExistingNodes,
          ...pastedNodes,
        ])
        const allUpdatedEdges = [...updatedExistingEdges, ...pastedEdges]

        setNodes(allUpdatedNodes)
        setEdges(allUpdatedEdges)

        setSelectedElementsId(newElementIds)

        return true
      } catch (error) {
        log.error("Failed to paste from clipboard:", error as Error)
        return false
      }
    },
    [nodes, edges, setNodes, setEdges, setSelectedElementsId]
  )

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

  const deleteSelectedElements = useCallback(() => {
    if (selectedElementIds.length === 0) {
      return false
    }

    const allNodesToDelete = getAllNodesToInclude(selectedElementIds, nodes)
    const expandedNodeIds = allNodesToDelete.map((node) => node.id)
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
    selectedElementIds,
    hasSelectedElements,
    selectAll,
    clearSelection,
    copySelectedElements,
    pasteElements,
    cutSelectedElements,
    deleteSelectedElements,
  }
}
