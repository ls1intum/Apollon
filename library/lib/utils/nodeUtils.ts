import { DiagramNodeTypeRecord, type DiagramNodeType } from "@/nodes"
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
 * Per-node-type label capabilities — the single source of truth for what
 * the rename popover and the SVG renderer must agree on.
 *
 *   `wrapsName`         — the node's SVG renders `data.name` through
 *                         `MultilineText` or one of the `layoutTextIn…`
 *                         shape helpers. When true, the rename popover
 *                         exposes a multiline input (Enter inserts `\n`).
 *   `rendersNameLabel`  — the node renders `data.name` at all. When false,
 *                         the rename popover hides the input entirely
 *                         (pure-symbol nodes like activity initial/final/
 *                         fork have no text to repaint).
 *
 * This is declared as `Record<DiagramNodeType, …> satisfies …` so adding
 * a new enum entry to `DiagramNodeTypeRecord` without classifying it here
 * becomes a compile error rather than a silent default. Change this table
 * only when a node's SVG wrapping behaviour actually changes.
 */
type NodeLabelCapabilities = {
  wrapsName: boolean
  rendersNameLabel: boolean
}

const NODE_LABEL_CAPABILITIES = {
  // Class diagram
  package: { wrapsName: true, rendersNameLabel: true },
  class: { wrapsName: false, rendersNameLabel: true },
  objectName: { wrapsName: false, rendersNameLabel: true },
  communicationObjectName: { wrapsName: false, rendersNameLabel: true },
  colorDescription: { wrapsName: true, rendersNameLabel: true },
  titleAndDesctiption: { wrapsName: false, rendersNameLabel: true },

  // Activity diagram
  activity: { wrapsName: true, rendersNameLabel: true },
  activityActionNode: { wrapsName: true, rendersNameLabel: true },
  activityObjectNode: { wrapsName: true, rendersNameLabel: true },
  activityMergeNode: { wrapsName: true, rendersNameLabel: true },
  activityInitialNode: { wrapsName: false, rendersNameLabel: false },
  activityFinalNode: { wrapsName: false, rendersNameLabel: false },
  activityForkNode: { wrapsName: false, rendersNameLabel: false },
  activityForkNodeHorizontal: { wrapsName: false, rendersNameLabel: false },

  // Use case diagram
  useCase: { wrapsName: true, rendersNameLabel: true },
  useCaseActor: { wrapsName: true, rendersNameLabel: true },
  useCaseSystem: { wrapsName: true, rendersNameLabel: true },

  // Component diagram
  component: { wrapsName: true, rendersNameLabel: true },
  componentSubsystem: { wrapsName: true, rendersNameLabel: true },
  componentInterface: { wrapsName: false, rendersNameLabel: true },

  // Deployment diagram
  deploymentNode: { wrapsName: true, rendersNameLabel: true },
  deploymentComponent: { wrapsName: true, rendersNameLabel: true },
  deploymentArtifact: { wrapsName: true, rendersNameLabel: true },
  deploymentInterface: { wrapsName: false, rendersNameLabel: true },

  // Flowchart
  flowchartTerminal: { wrapsName: true, rendersNameLabel: true },
  flowchartProcess: { wrapsName: true, rendersNameLabel: true },
  flowchartDecision: { wrapsName: true, rendersNameLabel: true },
  flowchartInputOutput: { wrapsName: true, rendersNameLabel: true },
  flowchartFunctionCall: { wrapsName: true, rendersNameLabel: true },

  // Syntax tree
  syntaxTreeTerminal: { wrapsName: true, rendersNameLabel: true },
  syntaxTreeNonterminal: { wrapsName: true, rendersNameLabel: true },

  // Petri net (labels are single-line below the shape by convention)
  petriNetTransition: { wrapsName: false, rendersNameLabel: true },
  petriNetPlace: { wrapsName: false, rendersNameLabel: true },

  // BPMN
  bpmnTask: { wrapsName: true, rendersNameLabel: true },
  bpmnSubprocess: { wrapsName: true, rendersNameLabel: true },
  bpmnTransaction: { wrapsName: true, rendersNameLabel: true },
  bpmnCallActivity: { wrapsName: true, rendersNameLabel: true },
  bpmnAnnotation: { wrapsName: true, rendersNameLabel: true },
  bpmnGroup: { wrapsName: true, rendersNameLabel: true },
  bpmnStartEvent: { wrapsName: false, rendersNameLabel: true },
  bpmnIntermediateEvent: { wrapsName: false, rendersNameLabel: true },
  bpmnEndEvent: { wrapsName: false, rendersNameLabel: true },
  bpmnGateway: { wrapsName: false, rendersNameLabel: true },
  bpmnPool: { wrapsName: false, rendersNameLabel: true },
  bpmnDataObject: { wrapsName: false, rendersNameLabel: true },
  bpmnDataStore: { wrapsName: false, rendersNameLabel: true },

  // Reachability graph
  reachabilityGraphMarking: { wrapsName: true, rendersNameLabel: true },

  // SFC
  sfcStep: { wrapsName: true, rendersNameLabel: true },
  sfcStart: { wrapsName: false, rendersNameLabel: true },
  sfcJump: { wrapsName: false, rendersNameLabel: true },
  sfcTransitionBranch: { wrapsName: false, rendersNameLabel: true },
  sfcActionTable: { wrapsName: false, rendersNameLabel: true },
} as const satisfies Record<DiagramNodeType, NodeLabelCapabilities>

/**
 * Does this node's SVG renderer wrap its label? Drives whether the rename
 * popover accepts multiline input — see `NODE_LABEL_CAPABILITIES`.
 */
export const supportsMultilineName = (nodeType?: string): boolean =>
  !!nodeType &&
  nodeType in NODE_LABEL_CAPABILITIES &&
  NODE_LABEL_CAPABILITIES[nodeType as DiagramNodeType].wrapsName

/**
 * Does this node render a user-editable text label at all? False for
 * pure-symbol nodes so the rename popover hides its input for them.
 */
export const rendersNameLabel = (nodeType?: string): boolean => {
  if (!nodeType) return true
  if (!(nodeType in NODE_LABEL_CAPABILITIES)) return true
  return NODE_LABEL_CAPABILITIES[nodeType as DiagramNodeType].rendersNameLabel
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
