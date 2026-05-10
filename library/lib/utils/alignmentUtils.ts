import { Node } from "@xyflow/react"
import { AlignmentGuide } from "@/store/alignmentGuidesStore"
import { getPositionOnCanvas, isParentNodeType } from "@/utils/nodeUtils"

const ALIGNMENT_THRESHOLD = 10 // pixels within which guides appear

export type AlignmentInfo = {
  horizontalGuides: number[] // x positions for vertical alignment lines
  verticalGuides: number[] // y positions for horizontal alignment lines
  snappedPosition?: {
    x?: number
    y?: number
  }
}

/**
 * Get the bounds of a node (considering its position and dimensions)
 */
export const getNodeBounds = (node: Node, allNodes?: Node[]) => {
  const position = allNodes
    ? getPositionOnCanvas(node, allNodes)
    : node.position
  const x = position.x
  const y = position.y
  const width = node.measured?.width || 100
  const height = node.measured?.height || 100

  return {
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
    centerX: x + width / 2,
    centerY: y + height / 2,
  }
}

const isContainedByParent = (node: Node, allNodes: Node[]) => {
  const nodeBounds = getNodeBounds(node, allNodes)
  return allNodes.some((candidate) => {
    if (candidate.id === node.id || !isParentNodeType(candidate.type)) {
      return false
    }

    const parentBounds = getNodeBounds(candidate, allNodes)
    return (
      nodeBounds.left >= parentBounds.left &&
      nodeBounds.right <= parentBounds.right &&
      nodeBounds.top >= parentBounds.top &&
      nodeBounds.bottom <= parentBounds.bottom
    )
  })
}

const getContainingParentId = (node: Node, allNodes: Node[]) => {
  if (node.parentId) {
    return node.parentId
  }

  const nodeBounds = getNodeBounds(node, allNodes)
  let bestParent: Node | undefined
  let bestArea = Infinity

  for (const candidate of allNodes) {
    if (candidate.id === node.id || !isParentNodeType(candidate.type)) {
      continue
    }

    const parentBounds = getNodeBounds(candidate, allNodes)
    const contains =
      nodeBounds.left >= parentBounds.left &&
      nodeBounds.right <= parentBounds.right &&
      nodeBounds.top >= parentBounds.top &&
      nodeBounds.bottom <= parentBounds.bottom

    if (!contains) {
      continue
    }

    const area =
      (parentBounds.right - parentBounds.left) *
      (parentBounds.bottom - parentBounds.top)
    if (area < bestArea) {
      bestArea = area
      bestParent = candidate
    }
  }

  return bestParent?.id
}

const shouldUseAsGuideTarget = (
  draggedNode: Node,
  node: Node,
  allNodes: Node[]
) => {
  const draggedParentId = getContainingParentId(draggedNode, allNodes)
  const nodeParentId = getContainingParentId(node, allNodes)

  if (!draggedParentId) {
    return !nodeParentId && !isContainedByParent(node, allNodes)
  }

  return node.id === draggedParentId || nodeParentId === draggedParentId
}

/**
 * Calculate alignment guides based on dragged node and other nodes
 */
export const calculateAlignmentGuides = (
  draggedNode: Node,
  allNodes: Node[],
  threshold: number = ALIGNMENT_THRESHOLD
): AlignmentGuide[] => {
  const nodesWithDrag = allNodes.map((node) =>
    node.id === draggedNode.id ? draggedNode : node
  )
  const draggedBounds = getNodeBounds(draggedNode, nodesWithDrag)
  const guides: AlignmentGuide[] = []
  const alignedPositions = new Set<number>()

  const otherNodes = nodesWithDrag.filter(
    (node) =>
      node.id !== draggedNode.id &&
      shouldUseAsGuideTarget(draggedNode, node, nodesWithDrag)
  )

  for (const node of otherNodes) {
    const nodeBounds = getNodeBounds(node, nodesWithDrag)

    // Vertical alignment (left, center, right edges)
    const verticalAlignments = [
      { pos: nodeBounds.left, name: "left" },
      { pos: nodeBounds.centerX, name: "center" },
      { pos: nodeBounds.right, name: "right" },
    ]

    const horizontalAlignments = [
      { pos: nodeBounds.top, name: "top" },
      { pos: nodeBounds.centerY, name: "center" },
      { pos: nodeBounds.bottom, name: "bottom" },
    ]

    // Check vertical alignment (draw vertical line for horizontal alignment)
    for (const alignment of verticalAlignments) {
      if (Math.abs(draggedBounds.left - alignment.pos) < threshold) {
        if (!alignedPositions.has(alignment.pos)) {
          guides.push({
            id: `vertical-${alignment.pos}`,
            type: "vertical",
            position: alignment.pos,
          })
          alignedPositions.add(alignment.pos)
        }
      }
      if (Math.abs(draggedBounds.centerX - alignment.pos) < threshold) {
        if (!alignedPositions.has(alignment.pos)) {
          guides.push({
            id: `vertical-center-${alignment.pos}`,
            type: "vertical",
            position: alignment.pos,
          })
          alignedPositions.add(alignment.pos)
        }
      }
      if (Math.abs(draggedBounds.right - alignment.pos) < threshold) {
        if (!alignedPositions.has(alignment.pos)) {
          guides.push({
            id: `vertical-right-${alignment.pos}`,
            type: "vertical",
            position: alignment.pos,
          })
          alignedPositions.add(alignment.pos)
        }
      }
    }

    // Check horizontal alignment (draw horizontal line for vertical alignment)
    for (const alignment of horizontalAlignments) {
      if (Math.abs(draggedBounds.top - alignment.pos) < threshold) {
        if (!alignedPositions.has(alignment.pos)) {
          guides.push({
            id: `horizontal-${alignment.pos}`,
            type: "horizontal",
            position: alignment.pos,
          })
          alignedPositions.add(alignment.pos)
        }
      }
      if (Math.abs(draggedBounds.centerY - alignment.pos) < threshold) {
        if (!alignedPositions.has(alignment.pos)) {
          guides.push({
            id: `horizontal-center-${alignment.pos}`,
            type: "horizontal",
            position: alignment.pos,
          })
          alignedPositions.add(alignment.pos)
        }
      }
      if (Math.abs(draggedBounds.bottom - alignment.pos) < threshold) {
        if (!alignedPositions.has(alignment.pos)) {
          guides.push({
            id: `horizontal-bottom-${alignment.pos}`,
            type: "horizontal",
            position: alignment.pos,
          })
          alignedPositions.add(alignment.pos)
        }
      }
    }
  }

  return guides
}

/**
 * Snap node position to nearby nodes
 */
export const snapNodeToGuides = (
  draggedNode: Node,
  guides: AlignmentGuide[],
  threshold: number = ALIGNMENT_THRESHOLD,
  allNodes?: Node[]
): { x?: number; y?: number } => {
  const draggedBounds = getNodeBounds(draggedNode, allNodes)
  const draggedPosition = allNodes
    ? getPositionOnCanvas(draggedNode, allNodes)
    : draggedNode.position
  const snappedPosition: { x?: number; y?: number } = {}

  for (const guide of guides) {
    if (guide.type === "vertical") {
      // Snap left edge
      if (Math.abs(draggedBounds.left - guide.position) < threshold) {
        snappedPosition.x = guide.position - draggedPosition.x
      }
      // Snap center
      if (Math.abs(draggedBounds.centerX - guide.position) < threshold) {
        snappedPosition.x =
          guide.position -
          draggedPosition.x -
          (draggedNode.measured?.width || 100) / 2
      }
      // Snap right edge
      if (Math.abs(draggedBounds.right - guide.position) < threshold) {
        snappedPosition.x =
          guide.position -
          draggedPosition.x -
          (draggedNode.measured?.width || 100)
      }
    } else if (guide.type === "horizontal") {
      // Snap top edge
      if (Math.abs(draggedBounds.top - guide.position) < threshold) {
        snappedPosition.y = guide.position - draggedPosition.y
      }
      // Snap center
      if (Math.abs(draggedBounds.centerY - guide.position) < threshold) {
        snappedPosition.y =
          guide.position -
          draggedPosition.y -
          (draggedNode.measured?.height || 100) / 2
      }
      // Snap bottom edge
      if (Math.abs(draggedBounds.bottom - guide.position) < threshold) {
        snappedPosition.y =
          guide.position -
          draggedPosition.y -
          (draggedNode.measured?.height || 100)
      }
    }
  }

  return snappedPosition
}
