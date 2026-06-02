/**
 * Edge Transformer - legacy edge data migration.
 *
 * Ensures imported edges carry `userWaypoints` and strips stale
 * runtime-only geometry (`computedSegments`) from persisted edge data.
 */

import type { ApollonEdge, UMLModel, OrthogonalEdgeData } from "@/typings"

/**
 * Hydrates a single edge's data object with OrthogonalEdgeData defaults.
 * Returns a new edge object (does NOT mutate the input).
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

  // Skip work if migration fields already exist and there is no stale
  // runtime geometry to remove.
  if (
    edge.data != null &&
    sourceData.userWaypoints !== undefined &&
    !hasComputedSegments
  ) {
    return edge
  }

  const data = { ...sourceData } as OrthogonalEdgeData & Record<string, unknown>
  delete data.computedSegments

  if (data.userWaypoints === undefined) {
    data.userWaypoints = []
  }

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
