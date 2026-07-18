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
 * Edge types rendered by the straight-path hook (`useStraightPathEdge`): a plain
 * two-point line between the adjusted endpoints, with no obstacle or neighbour
 * routing. Other (step) edges still route AROUND these lines — the solver emits
 * their two-point polylines into the shared route map for that reason.
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
 * router (`enableStraightPath === true`): the Class family (default true),
 * the Deployment family, and the SFC transition edge.
 */
export const STRAIGHT_PATH_STEP_EDGE_TYPES: ReadonlySet<string> = new Set([
  "ClassAggregation",
  "ClassInheritance",
  "ClassRealization",
  "ClassComposition",
  "ClassBidirectional",
  "ClassUnidirectional",
  "ClassDependency",
  "DeploymentAssociation",
  "DeploymentDependency",
  "DeploymentProvidedInterface",
  "DeploymentRequiredInterface",
  "DeploymentRequiredThreeQuarterInterface",
  "DeploymentRequiredQuarterInterface",
  "SfcDiagramEdge",
])

/**
 * Edge types whose ARROWHEAD end is merged when several of them land on the same
 * node side: the classic UML generalisation tree, where sub-classes share one
 * hollow triangle on the super-class rather than each drawing its own.
 *
 * This is a genuine aesthetic, not a shortcut — Purchase's UML studies rank
 * "joined inheritance arcs" alongside crossings and bends for class-diagram
 * comprehension. It is also the one place where OVERLAYING edges is correct: for
 * every other type a shared port reads as a defect, which is why the merge is
 * opt-in per type rather than a general rule.
 */
export const MERGED_ARROWHEAD_EDGE_TYPES: ReadonlySet<string> = new Set([
  "ClassInheritance",
  "ClassRealization",
])
