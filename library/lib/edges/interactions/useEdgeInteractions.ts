import { useEffect, useReducer, useCallback, useRef, useState } from "react"
import { useReactFlow } from "@xyflow/react"
import { edgeFSMReducer, initialEdgeFSMState } from "./EdgeFSM"
import { useRoutingStore } from "@/store/routingStore"
import { useDiagramStore, useMetadataStore } from "@/store"
import { calculateDraggedWaypoints } from "@/utils/geometry/waypointDrag"
import { buildEdgeObstacleSet } from "@/utils/geometry/edgeObstacles"
import { useHandleFinder } from "@/hooks/useHandleFinder"
import {
  resolveEndpointDragState,
  type FoundHandle,
} from "./resolveEndpointDragState"
import { IPoint } from "../types"
import { log } from "@/logger"

type PointerRef = {
  x: number
  y: number
  clientX: number
  clientY: number
}

export type EdgeDragKind =
  | { kind: "midpoint"; userWaypoints: IPoint[] }
  | {
      kind: "source"
      /** Snapped handle target (or null if dropped on empty canvas). */
      handle: FoundHandle | null
    }
  | {
      kind: "target"
      handle: FoundHandle | null
    }

export type EdgeDragCommit = {
  /** The final routed path produced by the worker. */
  finalPath: IPoint[]
  /** Drag-kind-specific payload — see EdgeDragKind. */
  drag: EdgeDragKind
}

export type UseEdgeInteractionsOptions = {
  sourceNodeId?: string
  targetNodeId?: string
  sourceHandleId?: string | null
  targetHandleId?: string | null
  /**
   * Called on pointer-up with the final routed path and drag-kind context so
   * the caller can persist appropriate edge fields.
   *
   * Receives `null` when the drag should be aborted (e.g. endpoint dropped on
   * empty canvas, or release before any meaningful drag occurred).
   */
  onCommit?: (commit: EdgeDragCommit | null) => void
}

/**
 * Drag interactions for an orthogonal edge.
 *
 * Architecture:
 *   - The rAF preview loop is preview-only. It writes to local hook state so
 *     the UI updates at 60 fps, but its results are never committed.
 *   - On pointer-up, a single authoritative route is computed from the
 *     actual release event (using the shared resolveEndpointDragState
 *     helper), awaited, and ONLY THEN persisted. This eliminates the
 *     "stale-preview commit" class of bugs.
 *   - Every routing request carries a generation number. Late results from
 *     earlier generations are dropped — both for preview updates and for
 *     the final commit. Cancellation is therefore safe across rAF, debounce,
 *     and pointer-up without race conditions.
 */
export function useEdgeInteractions(
  edgeId: string,
  routeSegments: IPoint[] = [],
  options: UseEdgeInteractionsOptions = {}
) {
  const {
    sourceNodeId,
    targetNodeId,
    sourceHandleId,
    targetHandleId,
    onCommit,
  } = options

  const [state, dispatch] = useReducer(edgeFSMReducer, initialEdgeFSMState)
  const [activeWaypoints, setActiveWaypoints] = useState<IPoint[] | null>(null)
  const { calculateRoute } = useRoutingStore()
  const { screenToFlowPosition } = useReactFlow()
  const { findBestHandleAtClientPosition } = useHandleFinder()
  const startConnectionGuidance = useMetadataStore(
    (s) => s.startConnectionGuidance
  )
  const setConnectionGuidanceTarget = useMetadataStore(
    (s) => s.setConnectionGuidanceTarget
  )
  const stopConnectionGuidance = useMetadataStore(
    (s) => s.stopConnectionGuidance
  )

  const pointerRef = useRef<PointerRef | null>(null)
  const isRoutingRef = useRef(false)
  const segmentsRef = useRef<IPoint[]>(routeSegments)
  const contextRef = useRef(state.context)
  const stateValueRef = useRef(state.value)

  // Monotonic generation counter. Every new route request gets the next
  // value via `++routeGenRef.current`; results are dropped if they no
  // longer match. Reset to 0 on each drag start.
  const routeGenRef = useRef(0)
  // The generation of the latest committed *preview* update.
  const lastAppliedPreviewGenRef = useRef(0)

  const nodes = useDiagramStore((s) => s.nodes)
  const nodesRef = useRef(nodes)
  const sourceNodeIdRef = useRef(sourceNodeId)
  const targetNodeIdRef = useRef(targetNodeId)
  const sourceHandleIdRef = useRef(sourceHandleId)
  const targetHandleIdRef = useRef(targetHandleId)
  const onCommitRef = useRef(onCommit)
  const findHandleRef = useRef(findBestHandleAtClientPosition)
  const setGuidanceTargetRef = useRef(setConnectionGuidanceTarget)
  const stopGuidanceRef = useRef(stopConnectionGuidance)
  const guidanceActiveRef = useRef(false)

  segmentsRef.current = routeSegments
  contextRef.current = state.context
  stateValueRef.current = state.value
  nodesRef.current = nodes
  sourceNodeIdRef.current = sourceNodeId
  targetNodeIdRef.current = targetNodeId
  sourceHandleIdRef.current = sourceHandleId
  targetHandleIdRef.current = targetHandleId
  onCommitRef.current = onCommit
  findHandleRef.current = findBestHandleAtClientPosition
  setGuidanceTargetRef.current = setConnectionGuidanceTarget
  stopGuidanceRef.current = stopConnectionGuidance

  const startDrag = useCallback(
    (
      e: React.PointerEvent<SVGElement>,
      targetType: "source" | "target" | "midpoint",
      waypointIndex?: number
    ) => {
      e.stopPropagation()
      ;(e.target as Element).setPointerCapture(e.pointerId)

      const point = screenToFlowPosition({ x: e.clientX, y: e.clientY })

      dispatch({
        type: "POINTER_DOWN",
        payload: { point, targetType, waypointIndex },
      })

      setActiveWaypoints(segmentsRef.current)
      routeGenRef.current = 0
      lastAppliedPreviewGenRef.current = 0
      pointerRef.current = {
        x: point.x,
        y: point.y,
        clientX: e.clientX,
        clientY: e.clientY,
      }
      if (targetType === "source" || targetType === "target") {
        startConnectionGuidance(
          targetType === "source"
            ? (sourceNodeIdRef.current ?? null)
            : (targetNodeIdRef.current ?? null),
          targetType === "source"
            ? (sourceHandleIdRef.current ?? null)
            : (targetHandleIdRef.current ?? null)
        )
        guidanceActiveRef.current = true
      }
    },
    [edgeId, screenToFlowPosition, startConnectionGuidance]
  )

  const onSegmentPointerDown = useCallback(
    (e: React.PointerEvent<SVGElement>, waypointIndex: number) => {
      startDrag(e, "midpoint", waypointIndex)
    },
    [startDrag]
  )

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent<SVGElement>, isSource: boolean) => {
      startDrag(e, isSource ? "source" : "target")
    },
    [startDrag]
  )

  useEffect(() => {
    if (state.value === "IDLE") return

    let animationFrameId = 0
    let cancelled = false

    // Preview loop: purely advisory. Writes to local hook state so the UI
    // tracks the cursor at 60 fps. Never commits anything; the final
    // commit comes from the pointer-up handler below.
    const routeLoop = async () => {
      if (cancelled) return
      if (!pointerRef.current || isRoutingRef.current) {
        animationFrameId = requestAnimationFrame(routeLoop)
        return
      }

      const point = pointerRef.current
      const segments = segmentsRef.current
      const ctx = contextRef.current
      const fsmValue = stateValueRef.current

      if (segments.length < 2) {
        animationFrameId = requestAnimationFrame(routeLoop)
        return
      }

      const gen = ++routeGenRef.current

      try {
        if (
          fsmValue === "DRAGGING_MIDPOINT" &&
          ctx.initialPoint &&
          ctx.waypointIndex !== undefined
        ) {
          const delta = {
            x: point.x - ctx.initialPoint.x,
            y: point.y - ctx.initialPoint.y,
          }
          const newWaypoints = calculateDraggedWaypoints(
            segments,
            ctx.waypointIndex,
            delta
          )

          const { obstacles, paddings } = buildEdgeObstacleSet(
            nodesRef.current,
            sourceNodeIdRef.current,
            targetNodeIdRef.current
          )

          isRoutingRef.current = true
          const path = await calculateRoute(
            edgeId,
            obstacles,
            segments[0],
            segments[segments.length - 1],
            newWaypoints,
            { paddings }
          )
          if (!cancelled && gen >= lastAppliedPreviewGenRef.current) {
            lastAppliedPreviewGenRef.current = gen
            setActiveWaypoints(path)
          }
        } else if (
          fsmValue === "DRAGGING_SOURCE" ||
          fsmValue === "DRAGGING_TARGET"
        ) {
          const draggedEnd =
            fsmValue === "DRAGGING_SOURCE" ? "source" : "target"
          const resolved = resolveEndpointDragState({
            draggedEnd,
            flowPoint: { x: point.x, y: point.y },
            clientX: point.clientX,
            clientY: point.clientY,
            nodes: nodesRef.current,
            sourceNodeId: sourceNodeIdRef.current,
            targetNodeId: targetNodeIdRef.current,
            findBestHandleAtClientPosition: findHandleRef.current,
          })
          setGuidanceTargetRef.current(
            resolved.foundHandle?.nodeId ?? null,
            resolved.foundHandle?.handleId ?? null
          )

          const routeSource =
            draggedEnd === "source" ? resolved.snappedPoint : segments[0]
          const routeTarget =
            draggedEnd === "target"
              ? resolved.snappedPoint
              : segments[segments.length - 1]

          isRoutingRef.current = true
          const path = await calculateRoute(
            edgeId,
            resolved.obstacles,
            routeSource,
            routeTarget,
            [],
            { paddings: resolved.paddings }
          )
          if (!cancelled && gen >= lastAppliedPreviewGenRef.current) {
            lastAppliedPreviewGenRef.current = gen
            setActiveWaypoints(path)
          }
        }
      } catch (e) {
        log.error("Routing error:", e)
      } finally {
        isRoutingRef.current = false
      }

      if (!cancelled) animationFrameId = requestAnimationFrame(routeLoop)
    }

    animationFrameId = requestAnimationFrame(routeLoop)

    const handlePointerMove = (e: PointerEvent) => {
      const flowPoint = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      pointerRef.current = {
        x: flowPoint.x,
        y: flowPoint.y,
        clientX: e.clientX,
        clientY: e.clientY,
      }
      dispatch({ type: "POINTER_MOVE", payload: { point: flowPoint } })
    }

    /**
     * The authoritative final route. Recomputed from the actual release
     * event — not from refs the rAF loop might have left in a stale state.
     * Awaited before commit so the persisted state is the truth, not the
     * last preview that happened to land.
     *
     * Carries the next generation number; any preview-loop results from
     * earlier generations are dropped on arrival.
     */
    const handlePointerUp = async (e?: PointerEvent) => {
      cancelled = true
      cancelAnimationFrame(animationFrameId)
      pointerRef.current = null

      // Pull the final release coordinates from the actual event when
      // available, falling back to whatever the rAF loop last saw.
      const fsmValue = stateValueRef.current
      const ctx = contextRef.current
      const segments = segmentsRef.current
      const commit = onCommitRef.current
      const cancelEvent = e?.type === "pointercancel"

      dispatch({ type: cancelEvent ? "CANCEL" : "POINTER_UP" })
      setActiveWaypoints(null)
      if (guidanceActiveRef.current) {
        guidanceActiveRef.current = false
        stopGuidanceRef.current()
      }

      if (!commit) return
      if (cancelEvent) {
        commit(null)
        return
      }

      // Resolve release coordinates from the event itself.
      let releaseFlowPoint: IPoint | null = null
      let releaseClientX = 0
      let releaseClientY = 0
      if (e) {
        const fp = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        releaseFlowPoint = { x: fp.x, y: fp.y }
        releaseClientX = e.clientX
        releaseClientY = e.clientY
      }

      if (!releaseFlowPoint || segments.length < 2) {
        commit(null)
        return
      }

      const finalGen = ++routeGenRef.current

      try {
        if (
          fsmValue === "DRAGGING_MIDPOINT" &&
          ctx.initialPoint &&
          ctx.waypointIndex !== undefined
        ) {
          const delta = {
            x: releaseFlowPoint.x - ctx.initialPoint.x,
            y: releaseFlowPoint.y - ctx.initialPoint.y,
          }
          const newWaypoints = calculateDraggedWaypoints(
            segments,
            ctx.waypointIndex,
            delta
          )

          const { obstacles, paddings } = buildEdgeObstacleSet(
            nodesRef.current,
            sourceNodeIdRef.current,
            targetNodeIdRef.current
          )

          const path = await calculateRoute(
            edgeId,
            obstacles,
            segments[0],
            segments[segments.length - 1],
            newWaypoints,
            { paddings }
          )

          if (finalGen !== routeGenRef.current) return // superseded
          if (path.length < 2) {
            commit(null)
            return
          }
          commit({
            finalPath: path,
            drag: { kind: "midpoint", userWaypoints: newWaypoints },
          })
        } else if (
          fsmValue === "DRAGGING_SOURCE" ||
          fsmValue === "DRAGGING_TARGET"
        ) {
          const draggedEnd =
            fsmValue === "DRAGGING_SOURCE" ? "source" : "target"
          const resolved = resolveEndpointDragState({
            draggedEnd,
            flowPoint: releaseFlowPoint,
            clientX: releaseClientX,
            clientY: releaseClientY,
            nodes: nodesRef.current,
            sourceNodeId: sourceNodeIdRef.current,
            targetNodeId: targetNodeIdRef.current,
            findBestHandleAtClientPosition: findHandleRef.current,
          })

          // Endpoint released on empty canvas — snap back to original.
          if (!resolved.foundHandle) {
            commit(null)
            return
          }

          const routeSource =
            draggedEnd === "source" ? resolved.snappedPoint : segments[0]
          const routeTarget =
            draggedEnd === "target"
              ? resolved.snappedPoint
              : segments[segments.length - 1]

          const path = await calculateRoute(
            edgeId,
            resolved.obstacles,
            routeSource,
            routeTarget,
            [],
            { paddings: resolved.paddings }
          )

          if (finalGen !== routeGenRef.current) return
          if (path.length < 2) {
            commit(null)
            return
          }
          commit({
            finalPath: path,
            drag: { kind: draggedEnd, handle: resolved.foundHandle },
          })
        }
      } catch (err) {
        log.error("Final routing failed:", err)
        commit(null)
      }
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)

    return () => {
      cancelled = true
      if (guidanceActiveRef.current) {
        guidanceActiveRef.current = false
        stopGuidanceRef.current()
      }
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
      cancelAnimationFrame(animationFrameId)
    }
    // Only re-install the listeners when the drag starts/stops; pointer
    // position and node updates feed through refs.
  }, [state.value, edgeId])

  return {
    fsmState: state,
    onSegmentPointerDown,
    onHandlePointerDown,
    activeWaypoints,
    isInteracting: state.value !== "IDLE",
  }
}
