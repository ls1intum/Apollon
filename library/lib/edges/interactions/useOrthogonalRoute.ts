import { useCallback, useEffect, useRef, useState } from "react"
import { useDiagramStore } from "@/store"
import { useRoutingStore } from "@/store/routingStore"
import { buildEdgeObstacleSet } from "@/utils/geometry/edgeObstacles"
import { segmentIntersectsObstacle } from "@/utils/geometry/OrthogonalVisibilityGraph"
import { log } from "@/logger"
import type { IPoint } from "../types"

type Params = {
  edgeId: string
  sourceNodeId: string
  targetNodeId: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  /** Current presentation-local route, if one was already computed. */
  currentRoute?: IPoint[]
  /**
   * Manual user-defined waypoints. Threaded through the router as via-points
   * so user-shaped bends survive auto-reroutes on endpoint / obstacle moves.
   */
  userWaypoints?: IPoint[]
  /**
   * Reserved for future use. Both routing modes currently re-route on
   * endpoint or obstacle changes; manual differs only in that segment drags
   * persist `userWaypoints` here so they're re-applied as via-points.
   */
  routingMode?: "auto" | "manual"
  /**
   * True while this edge is being interactively dragged. Automatic routing is
   * paused so the drag preview remains authoritative until commit/cancel.
   */
  isInteracting?: boolean
}

/** Debounce window for path-crossing checks after node movement. */
const NODE_MOVE_DEBOUNCE_MS = 150

/**
 * Computes a presentation-local orthogonal route for an edge.
 *
 * Two triggers:
 *   1. Endpoint coordinates change (mount, source/target node move) — re-route
 *      immediately, preserving any `userWaypoints` so manual bends survive.
 *   2. Any node moves and the current path now crosses that node's bbox —
 *      after a short debounce, re-route. Cheap precheck via
 *      `segmentIntersectsObstacle`; only edges actually impacted pay the
 *      worker round-trip.
 *
 * Skipped while the edge is being dragged (the interaction hook drives the UI
 * during drag). Manual edges still re-route; their `userWaypoints` are passed
 * through as via-points so the user's bends survive obstacle avoidance.
 *
 * The computed route is deliberately not persisted. It is derived from the
 * current layout and edge data, so persisting it would amplify Yjs traffic,
 * pollute undo history, and let independent clients race over equivalent
 * geometry.
 */
export function useOrthogonalRoute({
  edgeId,
  sourceNodeId,
  targetNodeId,
  sourceX,
  sourceY,
  targetX,
  targetY,
  currentRoute,
  userWaypoints,
  isInteracting = false,
}: Params): IPoint[] | undefined {
  const nodes = useDiagramStore((s) => s.nodes)
  const calculateRoute = useRoutingStore((s) => s.calculateRoute)
  const [localRoute, setLocalRoute] = useState<IPoint[] | undefined>()
  const routeSegments = localRoute ?? currentRoute

  // Track the last endpoint pair we successfully routed for.
  const lastRouteRef = useRef<string | null>(null)

  // Monotonic generation counter. Every request gets the next value via
  // `++routeGenRef.current`. Results are dropped if the counter has
  // advanced past their generation. This eliminates the class of bugs
  // where an effect cleanup runs but an in-flight route completes anyway
  // and overwrites a fresher value.
  const routeGenRef = useRef(0)

  useEffect(() => {
    if (Array.isArray(currentRoute) && currentRoute.length >= 2) {
      setLocalRoute(undefined)
      lastRouteRef.current = null
    }
  }, [currentRoute])

  const applyRoute = useCallback((path: IPoint[]) => {
    setLocalRoute(path)
  }, [])

  /**
   * Issues a route request tagged with the current generation. Resolves
   * with the path only if it's still the latest generation when the
   * worker returns; otherwise the result is dropped.
   */
  const runRoute = useCallback(
    async (signal: { cancelled: boolean }, gen: number) => {
      const { obstacles, paddings } = buildEdgeObstacleSet(
        nodes,
        sourceNodeId,
        targetNodeId
      )
      try {
        const path = await calculateRoute(
          edgeId,
          obstacles,
          { x: sourceX, y: sourceY },
          { x: targetX, y: targetY },
          userWaypoints,
          { paddings }
        )
        if (signal.cancelled) return
        if (gen !== routeGenRef.current) return // superseded
        if (path.length < 2) return
        applyRoute(path)
      } catch (err) {
        log.error("Routing failed for edge", edgeId, err)
      }
    },
    [
      edgeId,
      sourceNodeId,
      targetNodeId,
      sourceX,
      sourceY,
      targetX,
      targetY,
      userWaypoints,
      nodes,
      calculateRoute,
      applyRoute,
    ]
  )

  // -------------------------------------------------------------------------
  // (1) Initial route + endpoint-move re-route.
  //
  // Runs for both auto and manual edges. For manual edges, `runRoute`
  // threads `userWaypoints` through the router as via-points so the
  // user-shaped bends survive while only the first/last segments adjust.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isInteracting) return

    const needsRoute =
      !Array.isArray(routeSegments) ||
      routeSegments.length < 2 ||
      routeSegments[0].x !== sourceX ||
      routeSegments[0].y !== sourceY ||
      routeSegments[routeSegments.length - 1].x !== targetX ||
      routeSegments[routeSegments.length - 1].y !== targetY

    if (!needsRoute) return

    const key = `${sourceX},${sourceY}->${targetX},${targetY}`
    if (lastRouteRef.current === key) return
    lastRouteRef.current = key

    const signal = { cancelled: false }
    const gen = ++routeGenRef.current
    runRoute(signal, gen)

    return () => {
      signal.cancelled = true
    }
  }, [
    edgeId,
    sourceX,
    sourceY,
    targetX,
    targetY,
    isInteracting,
    routeSegments,
    runRoute,
  ])

  // -------------------------------------------------------------------------
  // (2) Re-route when a node has moved across the current path.
  //
  // Runs for both auto and manual edges. The signal is created outside the
  // timeout so the cleanup can cancel BOTH the pending timer and any
  // already-in-flight route from an earlier dependency value.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isInteracting) return
    if (!Array.isArray(routeSegments) || routeSegments.length < 2) return

    const signal = { cancelled: false }

    const handle = window.setTimeout(() => {
      if (signal.cancelled) return

      const { obstacles } = buildEdgeObstacleSet(
        nodes,
        sourceNodeId,
        targetNodeId
      )

      // Walk each segment; if any obstacle intersects it, the path is stale.
      let crosses = false
      for (let i = 0; i < routeSegments.length - 1; i++) {
        if (
          segmentIntersectsObstacle(
            routeSegments[i],
            routeSegments[i + 1],
            obstacles
          )
        ) {
          crosses = true
          break
        }
      }

      if (!crosses) return

      // Force the endpoint-route key to recompute next cycle too.
      lastRouteRef.current = null
      const gen = ++routeGenRef.current
      runRoute(signal, gen)
    }, NODE_MOVE_DEBOUNCE_MS)

    return () => {
      signal.cancelled = true
      window.clearTimeout(handle)
    }
  }, [
    edgeId,
    sourceNodeId,
    targetNodeId,
    isInteracting,
    routeSegments,
    nodes,
    runRoute,
  ])

  return localRoute
}
