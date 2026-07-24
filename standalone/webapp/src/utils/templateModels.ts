import { importDiagram, type UMLModel } from "@tumaet/apollon/model"

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

/** Clone and normalize a bundled asset through the public import boundary. */
export const prepareTemplateModel = (
  source: UMLModel,
  overrides: Partial<Pick<UMLModel, "id" | "title">> = {}
): UMLModel => {
  const clone =
    typeof structuredClone === "function"
      ? structuredClone(source)
      : (JSON.parse(JSON.stringify(source)) as UMLModel)
  const model = importDiagram(clone)

  return {
    ...model,
    ...overrides,
  }
}
