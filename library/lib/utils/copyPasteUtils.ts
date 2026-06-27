/* eslint-disable @typescript-eslint/no-explicit-any -- V3 legacy model shapes are untyped JSON at the version-conversion boundary; typing them fully is tracked separately. */
import { generateUUID } from "@/utils"
import type { Node, Edge } from "@xyflow/react"

export interface ClipboardData {
  nodes: Node[]
  edges: Edge[]
  parentChildRelations: Array<{
    parentId: string
    childId: string
    relativePosition: { x: number; y: number }
  }>
  timestamp: number
}

export const calculateRelativePosition = (
  childNode: Node,
  parentNode: Node
) => {
  return {
    x: childNode.position.x - parentNode.position.x,
    y: childNode.position.y - parentNode.position.y,
  }
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

export const getRelevantEdges = (
  selectedElementIds: string[],
  allEdges: Edge[]
) => {
  const selectedEdges = allEdges.filter((edge) =>
    selectedElementIds.includes(edge.id)
  )

  return [...selectedEdges]
}

export const buildParentChildRelations = (
  nodesToInclude: Node[],
  nodeIds: string[]
) => {
  const parentChildRelations: Array<{
    parentId: string
    childId: string
    relativePosition: { x: number; y: number }
  }> = []

  nodesToInclude.forEach((node) => {
    if (node.parentId && nodeIds.includes(node.parentId)) {
      const parentNode = nodesToInclude.find((n) => n.id === node.parentId)
      if (parentNode) {
        parentChildRelations.push({
          parentId: node.parentId,
          childId: node.id,
          relativePosition: calculateRelativePosition(node, parentNode),
        })
      }
    }
  })

  return parentChildRelations
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
  const allRelevantEdges = getRelevantEdges(selectedElementIds, allEdges)
  const parentChildRelations = buildParentChildRelations(
    allNodesToCopy,
    allNodeIds
  )

  return {
    nodes: allNodesToCopy,
    edges: allRelevantEdges,
    parentChildRelations,
    timestamp: Date.now(),
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
