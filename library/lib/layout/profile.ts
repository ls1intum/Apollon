import type { DiagramEdgeType } from "@/typings"

// Extreme safety ceiling. Exact routing is adaptively tiered below this point;
// the ceiling prevents an imported adversarial graph from monopolizing a
// Worker until its hard deadline.
export const LAYOUT_MAX_NODES = 120
export const LAYOUT_MAX_EDGES = 240

export type EdgeLayoutSemantics = "directed" | "undirected" | "parent-at-target"

/**
 * Placement meaning for every edge family. Keeping this map exhaustive makes a
 * new diagram edge an explicit layout decision instead of silently treating it
 * as an undirected association.
 */
const EDGE_LAYOUT_SEMANTICS = {
  ClassAggregation: "parent-at-target",
  ClassInheritance: "parent-at-target",
  ClassRealization: "parent-at-target",
  ClassComposition: "parent-at-target",
  ClassBidirectional: "undirected",
  ClassUnidirectional: "undirected",
  ClassDependency: "directed",
  ActivityControlFlow: "directed",
  ObjectLink: "undirected",
  FlowChartFlowline: "directed",
  SyntaxTreeLink: "directed",
  CommunicationLink: "undirected",
  PetriNetArc: "directed",
  UseCaseAssociation: "undirected",
  UseCaseInclude: "directed",
  UseCaseExtend: "directed",
  UseCaseGeneralization: "parent-at-target",
  ComponentDependency: "directed",
  ComponentProvidedInterface: "undirected",
  ComponentRequiredInterface: "undirected",
  ComponentRequiredThreeQuarterInterface: "undirected",
  ComponentRequiredQuarterInterface: "undirected",
  DeploymentAssociation: "undirected",
  DeploymentDependency: "directed",
  DeploymentProvidedInterface: "undirected",
  DeploymentRequiredInterface: "undirected",
  DeploymentRequiredThreeQuarterInterface: "undirected",
  DeploymentRequiredQuarterInterface: "undirected",
  SfcDiagramEdge: "directed",
  ReachabilityGraphArc: "directed",
  BPMNSequenceFlow: "directed",
  BPMNMessageFlow: "directed",
  BPMNAssociationFlow: "undirected",
  BPMNDataAssociationFlow: "directed",
} as const satisfies Record<DiagramEdgeType, EdgeLayoutSemantics>

export const edgeLayoutSemantics = (
  type: string | undefined
): EdgeLayoutSemantics =>
  EDGE_LAYOUT_SEMANTICS[type as DiagramEdgeType] ?? "undirected"
