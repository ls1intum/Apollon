/**
 * Edge Transformer - legacy edge data migration.
 *
 * Strips stale runtime-only geometry (`computedSegments`) that earlier
 * development builds persisted onto edge data, so imported diagrams open with
 * a clean `OrthogonalEdgeData` shape.
 */

import type { ApollonEdge, UMLModel, OrthogonalEdgeData } from "@/typings"

/**
 * Returns a new edge whose data is free of stale runtime geometry. Does NOT
 * mutate the input. Null/absent legacy data and points are normalized to the
 * canonical empty point list.
 */
export function hydrateEdgeData(edge: ApollonEdge): ApollonEdge {
  // Legacy/malformed payloads can carry a null or absent `data`; treat it as
  // empty rather than dereferencing it (which would throw mid-migration).
  const sourceData = (edge.data ?? {}) as OrthogonalEdgeData &
    Record<string, unknown>
  const hasComputedSegments = Object.prototype.hasOwnProperty.call(
    sourceData,
    "computedSegments"
  )

  // Already a clean object with nothing to strip or hydrate — leave it untouched.
  if (
    edge.data != null &&
    Array.isArray(sourceData.points) &&
    !hasComputedSegments
  ) {
    return edge
  }

  const data = { ...sourceData } as OrthogonalEdgeData & Record<string, unknown>
  delete data.computedSegments
  if (!Array.isArray(data.points)) data.points = []

  return { ...edge, data }
}

/**
 * Transforms all edges in a `UMLModel`, ensuring every edge satisfies
 * the `OrthogonalEdgeData` interface. Returns a new model object.
 */
export function transformEdges(model: UMLModel): UMLModel {
  const hydratedEdges = model.edges.map(hydrateEdgeData)

  // Only create a new model object if at least one edge was actually changed.
  const anyChanged = hydratedEdges.some((edge, i) => edge !== model.edges[i])
  if (!anyChanged) return model

  return {
    ...model,
    edges: hydratedEdges,
  }
}
