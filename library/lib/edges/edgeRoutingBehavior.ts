/**
 * Single source of truth for how each edge type is routed. Today these facts
 * are duplicated across the per-type edge components (which hook they call and
 * what `enableStraightPath` they pass); the central edge-geometry solver reads
 * them from here so the two can never disagree. When the components are migrated
 * to read the central route, they should read these sets too.
 *
 * Derived from `diagramEdgeTypes` (edges/types.tsx): the type → component map,
 * plus each component's fixed routing flags.
 */

/**
 * Edge types rendered by the straight-path hook (`useStraightPathEdge`): a direct
 * line through any user-authored interior waypoints, with no automatic obstacle
 * or neighbour routing. Other (step) edges still route AROUND these polylines —
 * the solver emits their complete authored routes into the shared map.
 */
export const STRAIGHT_HOOK_EDGE_TYPES: ReadonlySet<string> = new Set([
  "UseCaseAssociation",
  "UseCaseInclude",
  "UseCaseExtend",
  "UseCaseGeneralization",
  "SyntaxTreeLink",
  "PetriNetArc",
])

/**
 * Step edges that attempt a straight shot before falling back to the orthogonal
 * router (`enableStraightPath === true`). This is a geometry capability, not a
 * diagram-specific styling choice: every orthogonal family benefits from a
 * collision-free, facing two-point route.
 */
export const STRAIGHT_PATH_STEP_EDGE_TYPES: ReadonlySet<string> = new Set([
  "ClassAggregation",
  "ClassInheritance",
  "ClassRealization",
  "ClassComposition",
  "ClassBidirectional",
  "ClassUnidirectional",
  "ClassDependency",
  "ComponentDependency",
  "ComponentProvidedInterface",
  "ComponentRequiredInterface",
  "ComponentRequiredThreeQuarterInterface",
  "ComponentRequiredQuarterInterface",
  "DeploymentAssociation",
  "DeploymentDependency",
  "DeploymentProvidedInterface",
  "DeploymentRequiredInterface",
  "DeploymentRequiredThreeQuarterInterface",
  "DeploymentRequiredQuarterInterface",
  "FlowChartFlowline",
  "ReachabilityGraphArc",
  "SfcDiagramEdge",
])
