import type { Node } from "@xyflow/react"
import type { XYPosition } from "@xyflow/system"

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
