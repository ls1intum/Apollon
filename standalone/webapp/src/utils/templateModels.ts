import type { UMLModel } from "@tumaet/apollon"

type RuntimeNodeState = {
  selected?: boolean
  dragging?: boolean
  resizing?: boolean
}

type RuntimeEdgeState = {
  selected?: boolean
}

export type TemplateRoutingState = "automatic" | "pinned" | "authored"

/**
 * Classify the routing authority stored on an edge.
 *
 * Authored bends outrank endpoint pins in the solver, so they do here as well.
 * Keeping this vocabulary outside the visual tests makes their fixture policy
 * match the editor's actual routing semantics.
 */
export const getTemplateEdgeRoutingState = (
  edge: UMLModel["edges"][number]
): TemplateRoutingState => {
  if (Array.isArray(edge.data?.points) && edge.data.points.length > 0) {
    return "authored"
  }

  if (edge.data?.sourceAnchor != null || edge.data?.targetAnchor != null) {
    return "pinned"
  }

  return "automatic"
}

/**
 * Turn a bundled template asset into a clean model instance.
 *
 * The source JSON was originally captured from a live React Flow session and
 * still contains transient selection/drag/resize flags. Those flags describe
 * the editor that saved the asset, not the preset a user is creating. Strip
 * them while preserving deliberate routing authority:
 *
 * - no anchors + no points: the holistic router owns the edge;
 * - sourceAnchor/targetAnchor: the chosen endpoint seats stay pinned;
 * - non-empty points: the authored bend topology stays authoritative.
 *
 * Missing legacy edge data is normalized to an empty automatic point list so a
 * newly created preset satisfies the current UMLModel contract immediately.
 */
export const prepareTemplateModel = (
  source: UMLModel,
  overrides: Partial<Pick<UMLModel, "id" | "title">> = {}
): UMLModel => {
  const clone =
    typeof structuredClone === "function"
      ? structuredClone(source)
      : (JSON.parse(JSON.stringify(source)) as UMLModel)

  return {
    ...clone,
    ...overrides,
    nodes: clone.nodes.map((node) => {
      const persistentNode = {
        ...node,
      } as UMLModel["nodes"][number] & RuntimeNodeState
      delete persistentNode.selected
      delete persistentNode.dragging
      delete persistentNode.resizing
      return persistentNode
    }),
    edges: clone.edges.map((edge) => {
      const persistentEdge = {
        ...edge,
      } as UMLModel["edges"][number] & RuntimeEdgeState
      delete persistentEdge.selected
      return {
        ...persistentEdge,
        data: {
          ...(persistentEdge.data ?? {}),
          points: Array.isArray(persistentEdge.data?.points)
            ? persistentEdge.data.points
            : [],
        },
      }
    }),
  }
}
