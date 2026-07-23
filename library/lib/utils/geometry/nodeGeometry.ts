import type { Node } from "@xyflow/react"
import type { Rect, XYPosition } from "@xyflow/system"

/** Height of the raised UML package tab. Rendering and connection geometry
 * share this constant without coupling either layer to the other. */
export const PACKAGE_TAB_HEIGHT = 10

/** Rectangle whose border accepts connections. Most nodes use their full
 * measured bounds; packages connect to the main body below the notation tab. */
export const getNodeConnectionRect = (
  nodeType: string | undefined,
  rect: Rect
): Rect => {
  if (nodeType !== "package") return rect
  const inset = Math.min(PACKAGE_TAB_HEIGHT, Math.max(0, rect.height))
  return {
    ...rect,
    y: rect.y + inset,
    height: Math.max(0, rect.height - inset),
  }
}

/** Absolute flow-space position without importing the rendered node registry.
 * Kept in the geometry kernel so the routing Worker stays DOM/React-free. */
export const getRoutingPositionOnCanvas = (
  node: Node,
  allNodes: ReadonlyArray<Node>
): XYPosition => {
  const position: XYPosition = { x: node.position.x, y: node.position.y }
  let parent = node.parentId
    ? allNodes.find((candidate) => candidate.id === node.parentId)
    : null

  while (parent) {
    position.x += parent.position.x
    position.y += parent.position.y
    parent = parent.parentId
      ? allNodes.find((candidate) => candidate.id === parent!.parentId)
      : null
  }
  return position
}

const ROUTING_PARENT_NODE_TYPES = new Set([
  "package",
  "activity",
  "activitySwimlane",
  "useCaseSystem",
  "componentSubsystem",
  "deploymentNode",
  "deploymentComponent",
  "bpmnPool",
  "bpmnGroup",
  "bpmnSubprocess",
  "bpmnTransaction",
  "bpmnCallActivity",
])

export const isRoutingParentNodeType = (nodeType?: string): boolean =>
  nodeType !== undefined && ROUTING_PARENT_NODE_TYPES.has(nodeType)
