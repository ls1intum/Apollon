import { useEffect } from "react"
import { useStore, type InternalNode } from "@xyflow/react"
import { useDiagramStore, useEdgeGeometryStore } from "@/store/context"
import { computeAllEdgeGeometry } from "@/utils/geometry/edgeGeometrySolver"
import {
  STRAIGHT_HOOK_EDGE_TYPES,
  STRAIGHT_PATH_STEP_EDGE_TYPES,
} from "@/edges/edgeRoutingBehavior"
import type { IPoint } from "@/edges/Connection"

/**
 * Whether the parity probe is compiled in at all. True only in dev and the e2e
 * build (`VITE_E2E`); a real production build / the library dist statically
 * strips this whole module, so the central solver never runs in production
 * until it is deliberately wired in.
 */
export const EDGE_SOLVER_PARITY_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_E2E === "true"

const samePoints = (
  a: IPoint[] | undefined,
  b: IPoint[] | undefined
): boolean =>
  !!a &&
  !!b &&
  a.length === b.length &&
  a.every((p, i) => p.x === b[i].x && p.y === b[i].y)

/**
 * Shadow-compares the central single-pass solver against the CURRENTLY SHIPPING
 * per-edge routing, without touching a single edge component. Each edge already
 * publishes its real rendered polyline into `edgeGeometryStore.geometryById`, so
 * that map is the ground truth of what per-edge routing produced. This probe
 * runs `computeAllEdgeGeometry` over the same React Flow store and asserts, for
 * every published edge, that the solver's route is byte-identical.
 *
 * Results land on `window.__apollonSolverParity` for the parity e2e spec. This
 * is the gate that must be green before the central solver is wired into
 * rendering: it proves the solver reproduces today's output on real, measured
 * diagrams (where jsdom cannot, because handle bounds need a real layout).
 */
export const EdgeSolverParityProbe = () => {
  const nodes = useStore((s) => s.nodes)
  const nodeLookup = useStore(
    (s) => s.nodeLookup as unknown as Map<string, InternalNode>
  )
  const connectionMode = useStore((s) => s.connectionMode)
  const edges = useDiagramStore((s) => s.edges)
  const geometryById = useEdgeGeometryStore((s) => s.geometryById)

  useEffect(() => {
    // Inert unless a test explicitly opts in (the parity spec sets this before
    // load), so the probe adds zero solve cost to every other e2e/dev run.
    if (
      !(window as unknown as { __apollonEnableSolverParity?: boolean })
        .__apollonEnableSolverParity
    )
      return

    const { routeById } = computeAllEdgeGeometry({
      nodes,
      nodeLookup,
      connectionMode,
      edges,
      straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
      straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
    })

    const publishedIds = Object.keys(geometryById)
    const mismatches: {
      id: string
      type?: string
      solver?: IPoint[]
      actual: IPoint[]
    }[] = []
    for (const id of publishedIds) {
      if (!samePoints(routeById[id], geometryById[id])) {
        mismatches.push({
          id,
          type: edges.find((e) => e.id === id)?.type,
          solver: routeById[id],
          actual: geometryById[id],
        })
      }
    }

    ;(
      window as unknown as { __apollonSolverParity?: unknown }
    ).__apollonSolverParity = {
      total: publishedIds.length,
      mismatchCount: mismatches.length,
      mismatches: mismatches.slice(0, 20),
    }
  }, [nodes, nodeLookup, connectionMode, edges, geometryById])

  return null
}
