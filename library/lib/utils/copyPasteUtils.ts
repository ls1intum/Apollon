/* eslint-disable @typescript-eslint/no-explicit-any -- V3 legacy model shapes are untyped JSON at the version-conversion boundary; typing them fully is tracked separately. */
import { generateUUID } from "@/utils"
import type { Node, Edge } from "@xyflow/react"
import { CANVAS } from "@/constants"

/** What a copy or cut puts on the clipboard, as JSON. */
export interface ClipboardData {
  nodes: Node[]
  edges: Edge[]
}

export const getAllDescendants = (
  nodeIds: string[],
  allNodes: Node[]
): Node[] => {
  const descendants: Node[] = []
  const visited = new Set<string>()

  const findChildren = (parentIds: string[]) => {
    const children = allNodes.filter(
      (node) =>
        node.parentId &&
        parentIds.includes(node.parentId) &&
        !visited.has(node.id)
    )

    children.forEach((child) => visited.add(child.id))
    descendants.push(...children)

    if (children.length > 0) {
      findChildren(children.map((child) => child.id))
    }
  }

  findChildren(nodeIds)
  return descendants
}

export const getAllNodesToInclude = (
  selectedElementIds: string[],
  allNodes: Node[]
) => {
  const selectedNodes = allNodes.filter((node) =>
    selectedElementIds.includes(node.id)
  )
  const descendants = getAllDescendants(selectedElementIds, allNodes)
  return [...selectedNodes, ...descendants]
}

/**
 * The edges a copy carries: those selected outright, plus every edge running
 * between two copied nodes. Box-select and select-all mark connecting edges
 * selected themselves, but clicking elements one at a time selects nodes only —
 * without the second rule, duplicating two clicked classes would drop the
 * association between them.
 */
export const getRelevantEdges = (
  selectedElementIds: string[],
  copiedNodeIds: string[],
  allEdges: Edge[]
) => {
  const nodeIds = new Set(copiedNodeIds)
  return allEdges.filter(
    (edge) =>
      selectedElementIds.includes(edge.id) ||
      (nodeIds.has(edge.source) && nodeIds.has(edge.target))
  )
}

export const getEdgesToRemove = (
  selectedElementIds: string[],
  expandedNodeIds: string[],
  allEdges: Edge[]
) => {
  const selectedEdges = allEdges.filter((edge) =>
    selectedElementIds.includes(edge.id)
  )
  const connectedEdges = allEdges.filter(
    (edge) =>
      expandedNodeIds.includes(edge.source) ||
      expandedNodeIds.includes(edge.target)
  )

  return new Set([
    ...selectedEdges.map((e) => e.id),
    ...connectedEdges.map((e) => e.id),
  ])
}

export const createClipboardData = (
  selectedElementIds: string[],
  allNodes: Node[],
  allEdges: Edge[]
): ClipboardData => {
  const allNodesToCopy = getAllNodesToInclude(selectedElementIds, allNodes)
  const allNodeIds = allNodesToCopy.map((node) => node.id)
  const allRelevantEdges = getRelevantEdges(
    selectedElementIds,
    allNodeIds,
    allEdges
  )

  return { nodes: allNodesToCopy, edges: allRelevantEdges }
}

interface MaterializedClipboard {
  nodes: Node[]
  edges: Edge[]
  /** Ids of every materialized node and edge, for selecting them afterwards. */
  newElementIds: string[]
}

/**
 * Turn `ClipboardData` into insert-ready nodes/edges: fresh element ids (and
 * fresh nested attribute/method/row ids), parent references remapped onto the
 * new ids, and every top-level position shifted by
 * `PASTE_OFFSET_PX × offsetMultiplier` so repeated pastes cascade. Shared by
 * paste (multiplier = paste count) and duplicate (multiplier = 1, no clipboard
 * round-trip).
 */
export const materializeClipboardData = (
  clipboardData: ClipboardData,
  offsetMultiplier: number
): MaterializedClipboard => {
  const nodeIdMap = new Map<string, string>()
  const newElementIds: string[] = []
  const progressiveOffset = CANVAS.PASTE_OFFSET_PX * offsetMultiplier

  clipboardData.nodes.forEach((node) => {
    const newId = generateUUID()
    nodeIdMap.set(node.id, newId)
    newElementIds.push(newId)
  })

  const materializedNodes = clipboardData.nodes.map((node: Node) => {
    const materialized = {
      ...node,
      id: nodeIdMap.get(node.id)!,
      selected: true,
      data: createNewNodeDataWithNewIds(node.data),
    }

    // A child's position is relative to its parent, which already carries the
    // whole offset — moving the child too would drift it inside its own frame.
    if (node.parentId && nodeIdMap.has(node.parentId)) {
      return { ...materialized, parentId: nodeIdMap.get(node.parentId)! }
    }

    return {
      ...materialized,
      position: {
        x: node.position.x + progressiveOffset,
        y: node.position.y + progressiveOffset,
      },
    }
  })

  const materializedEdges = clipboardData.edges
    .filter((edge) => nodeIdMap.has(edge.source) && nodeIdMap.has(edge.target))
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

  return {
    nodes: materializedNodes,
    edges: materializedEdges,
    newElementIds,
  }
}

export const createNewNodeDataWithNewIds = (originalNodeData: any) => {
  if (!originalNodeData) return originalNodeData

  const newNodeData = { ...originalNodeData }

  if (
    originalNodeData.attributes &&
    Array.isArray(originalNodeData.attributes)
  ) {
    newNodeData.attributes = originalNodeData.attributes.map(
      (originalAttr: any) => {
        return {
          ...originalAttr,
          id: generateUUID(),
        }
      }
    )
  }

  if (originalNodeData.methods && Array.isArray(originalNodeData.methods)) {
    newNodeData.methods = originalNodeData.methods.map(
      (originalMethod: any) => {
        return {
          ...originalMethod,
          id: generateUUID(),
        }
      }
    )
  }
  if (
    originalNodeData.actionRows &&
    Array.isArray(originalNodeData.actionRows)
  ) {
    newNodeData.actionRows = originalNodeData.actionRows.map(
      (originalActionRow: any) => {
        return {
          ...originalActionRow,
          id: generateUUID(),
        }
      }
    )
  }

  return newNodeData
}
