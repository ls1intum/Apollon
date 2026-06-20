import { SIDES, type Side } from "./anchorModel"

/**
 * Per-node-type connection-handle configuration — the single source of truth
 * consumed by both the rendered handles (ConnectHandles) and the drop/reconnect
 * resolver (findClosestHandle callers). Keyed by the node-type STRING to avoid a
 * circular import through the React node registry.
 */

export type HandleVariant =
  | "key" // corners + centre (+ quarters on long sides) + magnetic grid
  | "center" // only the four side centres (NSEW shapes: circles, diamonds)
  | "none" // not connectable (legends, decorations)

export type HandleShape = "rect" | "ellipse"

export interface NodeHandleConfig {
  variant: HandleVariant
  shape: HandleShape
  excludeCorners: boolean
  sides: readonly Side[]
}

const DEFAULT_CONFIG: NodeHandleConfig = {
  variant: "key",
  shape: "rect",
  excludeCorners: false,
  sides: SIDES,
}

const center = (): NodeHandleConfig => ({
  ...DEFAULT_CONFIG,
  variant: "center",
})

// Node types whose visible shape only meaningfully connects at the centre of
// each side (BPMN circles/diamonds, flowchart decision/IO, activity
// initial/final/merge, interfaces, Petri net place/transition, …).
const CENTER_NODE_TYPES = [
  "bpmnStartEvent",
  "bpmnIntermediateEvent",
  "bpmnEndEvent",
  "bpmnGateway",
  "flowchartDecision",
  "flowchartInputOutput",
  "activityInitialNode",
  "activityFinalNode",
  "activityMergeNode",
  "sfcTransitionBranch",
  "componentInterface",
  "deploymentInterface",
  "petriNetPlace",
  "petriNetTransition",
]

const NODE_HANDLE_CONFIG: Record<string, NodeHandleConfig> = {
  ...Object.fromEntries(CENTER_NODE_TYPES.map((type) => [type, center()])),
  // Fork bars connect along their length but never at the very ends.
  activityForkNode: { ...DEFAULT_CONFIG, excludeCorners: true },
  activityForkNodeHorizontal: { ...DEFAULT_CONFIG, excludeCorners: true },
  // The use-case ellipse positions anchors on its perimeter.
  useCase: { ...DEFAULT_CONFIG, shape: "ellipse" },
  // Legend / decoration — no connection handles.
  colorDescription: { ...DEFAULT_CONFIG, variant: "none" },
}

/** Resolve the handle config for a node type (default = key/rect/all sides). */
export function getNodeHandleConfig(
  nodeType: string | undefined
): NodeHandleConfig {
  if (!nodeType) return DEFAULT_CONFIG
  return NODE_HANDLE_CONFIG[nodeType] ?? DEFAULT_CONFIG
}
