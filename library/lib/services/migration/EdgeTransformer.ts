/**
 * Edge Transformer — Legacy Edge Data Migration
 *
 * Intercepts imported diagram payloads and ensures every edge carries the
 * `OrthogonalEdgeData` interface properties (`userWaypoints`, `routingMode`).
 *
 * Transformation rules:
 *   ┌──────────────────────────────┬──────────────────────────────────────────┐
 *   │  Legacy Payload Field        │  Transformation                          │
 *   ├──────────────────────────────┼──────────────────────────────────────────┤
 *   │  data: {}                   │  data.userWaypoints = []                 │
 *   │                              │  data.routingMode = 'auto'               │
 *   ├──────────────────────────────┼──────────────────────────────────────────┤
 *   │  data.points (legacy SVG)   │  Discard / preserve for initial render.  │
 *   │                              │  A* recalculates on first load.          │
 *   ├──────────────────────────────┼──────────────────────────────────────────┤
 *   │  data.isManuallyLayouted    │  If true → routingMode = 'manual'        │
 *   └──────────────────────────────┴──────────────────────────────────────────┘
 *
 * After transformation, every edge in the model is guaranteed to satisfy
 * the `OrthogonalEdgeData` TypeScript interface, preventing runtime errors
 * when the new rendering engine attempts to read `userWaypoints` from
 * `undefined`. Stale computed routing geometry is removed during hydration.
 *
 * Thread Safety: This module is pure — no React, no side effects, no globals.
 * It can be used in a Web Worker context.
 */

import type { ApollonEdge, UMLModel, OrthogonalEdgeData } from "@/typings"

// ---------------------------------------------------------------------------
// Single Edge Transformer
// ---------------------------------------------------------------------------

/**
 * Hydrates a single edge's data object with OrthogonalEdgeData defaults.
 * Returns a new edge object (does NOT mutate the input).
 */
export function hydrateEdgeData(edge: ApollonEdge): ApollonEdge {
  const hasComputedSegments = Object.prototype.hasOwnProperty.call(
    edge.data,
    "computedSegments"
  )

  // Skip work if the edge already carries the routing fields and has no
  // stale runtime geometry to strip.
  if (
    edge.data.userWaypoints !== undefined &&
    edge.data.routingMode !== undefined &&
    !hasComputedSegments
  ) {
    return edge
  }

  const data = {
    ...(edge.data as OrthogonalEdgeData & Record<string, unknown>),
  } as OrthogonalEdgeData & Record<string, unknown>
  delete data.computedSegments

  if (data.userWaypoints === undefined) {
    data.userWaypoints = []
  }

  // If the legacy edge was manually layouted, preserve that intent.
  if (data.routingMode === undefined) {
    data.routingMode =
      (data as Record<string, unknown>).isManuallyLayouted === true
        ? "manual"
        : "auto"
  }

  return { ...edge, data }
}

// ---------------------------------------------------------------------------
// Batch Transformer
// ---------------------------------------------------------------------------

/**
 * Transforms all edges in a `UMLModel`, ensuring every edge satisfies
 * the `OrthogonalEdgeData` interface. Returns a new model object.
 *
 * @param model The imported UMLModel (potentially lacking OrthogonalEdgeData fields)
 * @returns A new UMLModel with all edges hydrated
 */
export function transformEdges(model: UMLModel): UMLModel {
  const hydratedEdges = model.edges.map(hydrateEdgeData)

  // Only create a new model object if at least one edge was actually changed
  const anyChanged = hydratedEdges.some((edge, i) => edge !== model.edges[i])
  if (!anyChanged) return model

  return {
    ...model,
    edges: hydratedEdges,
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates that every edge in the model carries valid OrthogonalEdgeData.
 * Returns an array of edge IDs that failed validation.
 */
export function validateEdgeMigration(model: UMLModel): string[] {
  const failures: string[] = []

  for (const edge of model.edges) {
    const data = edge.data as OrthogonalEdgeData | undefined
    if (!data) {
      failures.push(edge.id)
      continue
    }
    if (!Array.isArray(data.userWaypoints)) {
      failures.push(edge.id)
      continue
    }
    if (data.routingMode !== "auto" && data.routingMode !== "manual") {
      failures.push(edge.id)
    }
  }

  return failures
}
