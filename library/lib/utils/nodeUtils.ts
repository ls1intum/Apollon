import { DiagramNodeTypeRecord } from "@/nodes"
import { XYPosition, type Node } from "@xyflow/react"
import { log } from "../logger"

export const getPositionOnCanvas = (
  node: Node,
  allNodes: Node[]
): XYPosition => {
  // we need to copy position object here, otherwise updates node's position
  const position: XYPosition = { x: node.position.x, y: node.position.y }
  let parent = node.parentId
    ? allNodes.find((n) => n.id === node.parentId)
    : null

  while (parent) {
    position.x = position.x + parent.position.x
    position.y = position.y + parent.position.y

    parent = parent.parentId
      ? allNodes.find((n) => n.id === parent!.parentId)
      : null
  }

  return position
}

export const resizeAllParents = (node: Node, allNodes: Node[]) => {
  let currentNode = node

  while (currentNode.parentId) {
    const parent = allNodes.find((n) => n.id === currentNode.parentId)!
    const allChildren = allNodes.filter((n) => n.parentId === parent.id)

    if (currentNode.position.x < 0) {
      const parentPositionUpdateOffsetX = -1 * currentNode.position.x
      parent.position.x = parent.position.x - parentPositionUpdateOffsetX
      parent.width = parent.width! + parentPositionUpdateOffsetX
      allChildren.forEach((child) => {
        child.position.x = child.position.x + parentPositionUpdateOffsetX
      })
    }
    if (currentNode.position.y < 0) {
      const parentPositionUpdateOffsetY = -1 * currentNode.position.y
      parent.position.y = parent.position.y - parentPositionUpdateOffsetY
      parent.height = parent.height! + parentPositionUpdateOffsetY
      allChildren.forEach((child) => {
        child.position.y = child.position.y + parentPositionUpdateOffsetY
      })
    }
    if (currentNode.position.x + currentNode.width! > parent.width!) {
      parent.width = currentNode.position.x + currentNode.width!
    }
    if (currentNode.position.y + currentNode.height! > parent.height!) {
      parent.height = currentNode.position.y + currentNode.height!
    }

    currentNode = allNodes.find((n) => n.id === currentNode.parentId)!
  }
  return allNodes
}

export function sortNodesTopologically(nodes: Node[]): Node[] {
  const nodeMap = new Map<string, Node>()
  nodes.forEach((node) => nodeMap.set(node.id, node))

  const sorted: Node[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  const visit = (node: Node) => {
    if (visited.has(node.id)) return
    if (visiting.has(node.id)) {
      throw new Error(`Circular dependency detected at node ${node.id}`)
    }

    visiting.add(node.id)

    if (node.parentId) {
      const parentNode = nodeMap.get(node.parentId)
      if (parentNode) {
        visit(parentNode)
      } else {
        log.warn(
          `Parent node with id ${node.parentId} not found for node ${node.id}`
        )
      }
    }

    visiting.delete(node.id)
    visited.add(node.id)
    sorted.push(node)
  }

  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      visit(node)
    }
  })

  return sorted
}

/**
 * Does this node's SVG renderer support multi-line label text?
 *
 * The rename input in `NodeStyleEditor` is rendered as a single-line text
 * field by default; callers use this predicate to decide whether the input
 * should instead be multiline, so the editor only accepts `\n` for nodes
 * whose SVG actually wraps and repaints them. If a node draws its label
 * with `MultilineText` or one of the `layoutTextIn…` shape helpers, the
 * answer is yes; if it draws with plain `CustomText` (Petri-net labels,
 * class tables, BPMN events/gateways, edge labels), the answer is no.
 *
 * The list below is the single source of truth. Adding a new node that
 * wraps text MUST add an entry here, and removing wrapping from an
 * existing node MUST remove its entry — otherwise the editor and the
 * renderer drift.
 */
export const supportsMultilineName = (nodeType?: string): boolean => {
  if (!nodeType) return false
  switch (nodeType) {
    case DiagramNodeTypeRecord.activity:
    case DiagramNodeTypeRecord.activityActionNode:
    case DiagramNodeTypeRecord.activityObjectNode:
    case DiagramNodeTypeRecord.activityMergeNode:
    case DiagramNodeTypeRecord.useCase:
    case DiagramNodeTypeRecord.useCaseActor:
    case DiagramNodeTypeRecord.useCaseSystem:
    case DiagramNodeTypeRecord.component:
    case DiagramNodeTypeRecord.componentSubsystem:
    case DiagramNodeTypeRecord.deploymentNode:
    case DiagramNodeTypeRecord.deploymentComponent:
    case DiagramNodeTypeRecord.deploymentArtifact:
    case DiagramNodeTypeRecord.flowchartTerminal:
    case DiagramNodeTypeRecord.flowchartProcess:
    case DiagramNodeTypeRecord.flowchartDecision:
    case DiagramNodeTypeRecord.flowchartInputOutput:
    case DiagramNodeTypeRecord.flowchartFunctionCall:
    case DiagramNodeTypeRecord.syntaxTreeTerminal:
    case DiagramNodeTypeRecord.syntaxTreeNonterminal:
    case DiagramNodeTypeRecord.bpmnTask:
    case DiagramNodeTypeRecord.bpmnSubprocess:
    case DiagramNodeTypeRecord.bpmnTransaction:
    case DiagramNodeTypeRecord.bpmnCallActivity:
    case DiagramNodeTypeRecord.bpmnAnnotation:
    case DiagramNodeTypeRecord.bpmnGroup:
    case DiagramNodeTypeRecord.reachabilityGraphMarking:
    case DiagramNodeTypeRecord.sfcStep:
    case DiagramNodeTypeRecord.package:
    case DiagramNodeTypeRecord.colorDescription:
      return true
    default:
      return false
  }
}

/**
 * Does this node render a user-editable text label at all?
 *
 * Some "symbol" nodes (activity initial / final / fork, SFC symbols, etc.)
 * have no SVG text — they're pure decoration. Surfacing a rename input
 * for them in the popover is confusing because any text the user types
 * is stored but never repaints. Callers use this predicate to decide
 * whether the rename input should appear; false means hide it entirely.
 */
export const rendersNameLabel = (nodeType?: string): boolean => {
  if (!nodeType) return true
  switch (nodeType) {
    case DiagramNodeTypeRecord.activityInitialNode:
    case DiagramNodeTypeRecord.activityFinalNode:
    case DiagramNodeTypeRecord.activityForkNode:
    case DiagramNodeTypeRecord.activityForkNodeHorizontal:
      return false
    default:
      return true
  }
}

export const isParentNodeType = (nodeType?: string) => {
  if (!nodeType) {
    return false
  }

  return (
    nodeType === DiagramNodeTypeRecord.package ||
    nodeType === DiagramNodeTypeRecord.activity ||
    nodeType === DiagramNodeTypeRecord.useCaseSystem ||
    nodeType === DiagramNodeTypeRecord.componentSubsystem ||
    nodeType === DiagramNodeTypeRecord.deploymentNode ||
    nodeType === DiagramNodeTypeRecord.deploymentComponent ||
    nodeType === DiagramNodeTypeRecord.bpmnPool ||
    nodeType === DiagramNodeTypeRecord.bpmnGroup ||
    nodeType === DiagramNodeTypeRecord.bpmnSubprocess ||
    nodeType === DiagramNodeTypeRecord.bpmnTransaction ||
    nodeType === DiagramNodeTypeRecord.bpmnCallActivity
  )
}
