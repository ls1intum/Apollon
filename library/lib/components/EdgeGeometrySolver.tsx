import { use, useLayoutEffect, useRef } from "react"
import { useStore, type InternalNode } from "@xyflow/react"
import { useShallow } from "zustand/shallow"
import {
  EdgeGeometryStoreContext,
  useDiagramStore,
  useEdgeGeometryStore,
  useMetadataStore,
} from "@/store/context"
import {
  computeAllEdgeGeometry,
  type EdgeSolveCacheEntry,
  type SolverInput,
} from "@/utils/geometry/edgeGeometrySolver"
import {
  EDGE_GEOMETRY_WORKER_EDGE_THRESHOLD,
  EDGE_GEOMETRY_WORKER_PREVIEW_CADENCE_MS,
  EdgeGeometryWorkerController,
  createEdgeGeometryWorkerSessionId,
  shouldSampleEdgeGeometryWorker,
  shouldUseEdgeGeometryWorker,
} from "@/utils/geometry/edgeGeometryWorkerController"
import {
  serializeEdgeSolveCache,
  serializeSolverInput,
  type EdgeGeometryWorkerResponse,
} from "@/utils/geometry/edgeGeometryWorkerProtocol"
import {
  EDGE_GEOMETRY_SETTLEMENT_DURATION_MS,
  interpolateEdgeGeometrySettlement,
  prepareEdgeGeometrySettlement,
  projectRoutesWhileSolving,
  resolveReleasedEdgeGeometryPreview,
  snapshotEdgeGeometryNodes,
  stabilizeProvisionalRoutes,
  type ActiveEdgeGeometryGesture,
  type EdgeGeometryNodeSnapshot,
  type ProvisionalRouteDecisionState,
  type ReleasedEdgeGeometryPreview,
} from "@/utils/geometry/edgeGeometryPreview"
import {
  mergeRoutingPerfCounters,
  recordSolve,
  recordPreviewDecisionStabilization,
  recordWorkerAttempt,
  recordWorkerFallback,
  recordWorkerSolve,
  recordWorkerSyncDecision,
} from "@/sync/perfCounters"
import {
  STRAIGHT_HOOK_EDGE_TYPES,
  STRAIGHT_PATH_STEP_EDGE_TYPES,
} from "@/edges/edgeRoutingBehavior"
import type { IPoint } from "@/edges/Connection"

/**
 * The central edge-geometry engine. The first solve and small diagrams stay
 * synchronous so initial geometry lands before paint. Large subsequent solves
 * use a coalescing Worker queue. During interaction, superseded exact solves may
 * improve the display-only preview, but cannot commit obsolete drag geometry.
 *
 * Display projections are published separately from accepted geometry. The
 * moving edge follows the pointer immediately, while spatial consumers keep a
 * stable settled snapshot until the holistic side/port/route solve commits.
 */
export const EdgeGeometrySolver = () => {
  const nodes = useStore((s) => s.nodes)
  const nodeLookup = useStore(
    (s) => s.nodeLookup as unknown as Map<string, InternalNode>
  )
  const connectionMode = useStore((s) => s.connectionMode)
  const { edges, nodeInteractionActive } = useDiagramStore(
    useShallow((state) => ({
      edges: state.edges,
      // Controlled React Flow nodes round-trip their transient flags through the
      // diagram store. The RF store's `nodes` input does not reliably retain
      // those flags, so use the authoritative onNodesChange result here.
      nodeInteractionActive: state.nodes.some(
        (node) => node.dragging || node.resizing
      ),
    }))
  )
  const setAllGeometry = useEdgeGeometryStore((s) => s.setAllGeometry)
  const setPreviewGeometry = useEdgeGeometryStore((s) => s.setPreviewGeometry)
  // The raw store, read via getState() inside the effect (not subscribed — that
  // would re-trigger the solve it commits) to hold the last routes for edges
  // whose nodes are momentarily unmeasured.
  const geometryStore = use(EdgeGeometryStoreContext)
  // The edge being bend/endpoint-dragged right now, if any: bends are authoritative;
  // reconnects substitute the exact edge pointer-up will commit before solving.
  const liveEdgeOverride = useMetadataStore((s) => s.liveEdgeOverride)
  // A NEW connection being drawn onto a node: routed alongside the real edges so
  // every neighbour fans/re-anchors to make room LIVE (the fan orders by partner
  // geometry, so the reflow matches the committed edge and does not jump on drop).
  const pendingConnectionEdge = useMetadataStore((s) => s.pendingConnectionEdge)

  // Cross-frame memo of each edge's routed polyline, keyed on a signature of the
  // router's inputs, so an edge whose inputs did not change skips the search. A
  // ref (not state) — it is a cache, never a render trigger.
  const solveCacheRef = useRef<Map<string, EdgeSolveCacheEntry>>(new Map())
  const hasRunInitialSolveRef = useRef(false)
  const workerDisabledRef = useRef(false)
  const workerRef = useRef<Worker | null>(null)
  const workerControllerRef = useRef<EdgeGeometryWorkerController | null>(null)
  const workerHasSubmittedRef = useRef(false)
  const scheduledWorkerSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const latestSolverInputRef = useRef<SolverInput | null>(null)
  const latestNodeGeometryRef = useRef<EdgeGeometryNodeSnapshot | null>(null)
  const settledNodeGeometryRef = useRef<EdgeGeometryNodeSnapshot | null>(null)
  const provisionalRoutesRef = useRef<Record<string, IPoint[]> | null>(null)
  const provisionalNodeGeometryRef = useRef<EdgeGeometryNodeSnapshot | null>(
    null
  )
  const provisionalDecisionRef = useRef<ProvisionalRouteDecisionState>(
    new Map()
  )
  const submittedNodeGeometryRef = useRef<
    Map<number, EdgeGeometryNodeSnapshot>
  >(new Map())
  const settlementAnimationFrameRef = useRef<number | null>(null)
  const settlementAnimationTokenRef = useRef(0)
  const settledRoutesRef = useRef<Record<string, IPoint[]>>({})
  const activeEdgeGestureRef = useRef<ActiveEdgeGeometryGesture | null>(null)
  const releasedEdgePreviewRef = useRef<ReleasedEdgeGeometryPreview | null>(
    null
  )

  // RF mutates `nodeLookup` in place and keeps the `nodes` ref stable across
  // measurement, so keying the solve on those refs would freeze a stale result.
  // Subscribe instead to a content signature of everything a route depends on:
  // position, measured size, `handleBounds` (endpoints derive from measured
  // handle rects, which land a frame after the body — without this the first,
  // pre-handle solve would stick), and `hidden` (hidden nodes drop out of the
  // obstacle set). `useShallow` yields a new array only when one of these moves.
  const nodeGeometryKey = useStore(
    useShallow((s) => {
      const sig: string[] = []
      for (const n of s.nodeLookup.values()) {
        const p = n.internals.positionAbsolute
        const hb = n.internals.handleBounds
        const handlesSig = (handles: NonNullable<typeof hb>["source"]) =>
          handles
            ?.map(
              (handle) =>
                `${handle.id ?? ""},${handle.position},${handle.x},${handle.y},${handle.width},${handle.height}`
            )
            .join(";") ?? "-"
        const hbSig = hb
          ? `s:${handlesSig(hb.source)}|t:${handlesSig(hb.target)}`
          : "nohb"
        sig.push(
          `${n.id}|${p.x},${p.y}|${n.measured?.width ?? n.width},${n.measured?.height ?? n.height}|${hbSig}|${n.hidden ? 1 : 0}`
        )
      }
      return sig
    })
  )

  // Compute AND commit in the layout effect, not a memo. The React Compiler
  // infers a useMemo's deps from what its body READS and strips the rest, so a
  // memo keyed on `nodeGeometryKey` (never read inside) loses its only trigger
  // and caches the first, pre-measurement solve forever. Effect dependency
  // arrays are honored verbatim at runtime (the compiler does not rewrite them),
  // so keying on `nodeGeometryKey` — a fresh array ref, via `useShallow`,
  // precisely when any node's geometry moves — recomputes exactly when routes
  // can change, reading the current in-place-mutated `nodeLookup`.
  useLayoutEffect(() => {
    const cancelSettlementAnimation = () => {
      settlementAnimationTokenRef.current++
      if (settlementAnimationFrameRef.current !== null)
        cancelAnimationFrame(settlementAnimationFrameRef.current)
      settlementAnimationFrameRef.current = null
    }
    // A new authored input always outranks an older display handoff. The solve
    // below either replaces the preview synchronously or publishes a projection
    // for the new generation in this same layout effect.
    cancelSettlementAnimation()
    const clearScheduledWorkerSubmit = () => {
      if (scheduledWorkerSubmitRef.current === null) return
      clearTimeout(scheduledWorkerSubmitRef.current)
      scheduledWorkerSubmitRef.current = null
    }
    const solverEdges = pendingConnectionEdge
      ? [...edges, pendingConnectionEdge]
      : edges
    const input: SolverInput = {
      nodes,
      nodeLookup,
      connectionMode,
      edges: solverEdges,
      straightPathTypes: STRAIGHT_PATH_STEP_EDGE_TYPES,
      straightHookTypes: STRAIGHT_HOOK_EDGE_TYPES,
      liveOverride: liveEdgeOverride,
      previous: geometryStore?.getState().geometryById,
    }
    latestSolverInputRef.current = input
    const currentNodeGeometry = snapshotEdgeGeometryNodes(nodeLookup)
    latestNodeGeometryRef.current = currentNodeGeometry
    if (liveEdgeOverride) {
      const activeGesture = activeEdgeGestureRef.current
      if (!activeGesture || activeGesture.edgeId !== liveEdgeOverride.edgeId) {
        activeEdgeGestureRef.current = {
          edgeId: liveEdgeOverride.edgeId,
          originalEdge: edges.find(
            (edge) => edge.id === liveEdgeOverride.edgeId
          ),
          latestPoints: liveEdgeOverride.points,
        }
      } else {
        activeGesture.latestPoints = liveEdgeOverride.points
      }
      releasedEdgePreviewRef.current = null
    } else if (activeEdgeGestureRef.current) {
      const geometryState = geometryStore?.getState()
      releasedEdgePreviewRef.current = resolveReleasedEdgeGeometryPreview(
        activeEdgeGestureRef.current,
        edges,
        geometryState?.previewById ?? {},
        geometryState?.geometryById ?? {}
      )
      activeEdgeGestureRef.current = null
    }

    const solveSynchronously = (solveInput: SolverInput) => {
      const startedAt =
        import.meta.env.DEV || import.meta.env.VITE_E2E === "true"
          ? performance.now()
          : 0
      const { routeById } = computeAllEdgeGeometry({
        ...solveInput,
        solveCache: solveCacheRef.current,
      })
      if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
        recordSolve(performance.now() - startedAt)
      const acceptedNodeGeometry = snapshotEdgeGeometryNodes(
        solveInput.nodeLookup
      )
      setAllGeometry(routeById, acceptedNodeGeometry)
      releasedEdgePreviewRef.current = null
      provisionalRoutesRef.current = null
      provisionalNodeGeometryRef.current = null
      provisionalDecisionRef.current.clear()
      settledRoutesRef.current =
        geometryStore?.getState().geometryById ?? routeById
      settledNodeGeometryRef.current = acceptedNodeGeometry
      submittedNodeGeometryRef.current.clear()
      geometryStore?.getState().setSolving(false)
    }

    const useWorker = shouldUseEdgeGeometryWorker({
      hasRunInitialSolve: hasRunInitialSolveRef.current,
      edgeCount: solverEdges.length,
      threshold: EDGE_GEOMETRY_WORKER_EDGE_THRESHOLD,
      disabled: workerDisabledRef.current,
    })

    if (!useWorker) {
      clearScheduledWorkerSubmit()
      if (
        (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") &&
        !workerDisabledRef.current
      )
        recordWorkerSyncDecision(
          hasRunInitialSolveRef.current ? "small" : "initial"
        )
      // A previously launched solve may still finish after the diagram became
      // small. Invalidate it before committing the exact synchronous snapshot.
      workerControllerRef.current?.invalidate()
      solveSynchronously(input)
      hasRunInitialSolveRef.current = true
      return
    }

    geometryStore?.getState().setSolving(true)

    // Keep every settled route attached to its moving/resizing endpoints while
    // the Worker proves the new optimum. This projection is display-only and
    // orthogonal; the accepted exact generation replaces it atomically.
    const publishProjectedPreview = (
      baseRoutes: Readonly<Record<string, IPoint[]>>,
      baseNodes: EdgeGeometryNodeSnapshot | null
    ) => {
      const latestInput = latestSolverInputRef.current
      const latestNodes = latestNodeGeometryRef.current
      if (!latestInput || !latestNodes) return
      const pendingGeometry = baseNodes
        ? projectRoutesWhileSolving(
            baseRoutes,
            latestInput.edges,
            baseNodes,
            latestNodes
          )
        : baseRoutes
      const currentOverride = latestInput.liveOverride
      const releasedEdgePreview = releasedEdgePreviewRef.current
      setPreviewGeometry(
        currentOverride
          ? {
              ...pendingGeometry,
              // A provisional Worker generation can lag the pointer. The edge
              // being authored remains the immediate source of truth while its
              // neighbours inherit the Worker's holistic side/port/route work.
              [currentOverride.edgeId]: currentOverride.points,
            }
          : releasedEdgePreview
            ? {
                ...pendingGeometry,
                // Pointer-up has committed this edge, but the exact release solve
                // may still be queued behind an obsolete in-flight generation.
                // Keep the authored route visible until that accepted generation
                // atomically promotes/replaces it.
                [releasedEdgePreview.edgeId]: releasedEdgePreview.points,
              }
            : pendingGeometry
      )
    }

    publishProjectedPreview(
      provisionalRoutesRef.current ?? settledRoutesRef.current,
      provisionalNodeGeometryRef.current ?? settledNodeGeometryRef.current
    )

    const fallbackToLatestSnapshot = (message: string) => {
      if (workerDisabledRef.current) return
      if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
        recordWorkerFallback()
        // Dev/E2E diagnostic only; production falls back silently.
        // eslint-disable-next-line no-console
        console.warn(`[edge-geometry-worker] ${message}`)
      }
      workerDisabledRef.current = true
      clearScheduledWorkerSubmit()
      const controller = workerControllerRef.current
      workerControllerRef.current = null
      workerRef.current = null
      controller?.dispose()
      const latest = latestSolverInputRef.current
      if (latest) solveSynchronously(latest)
    }

    let controller = workerControllerRef.current
    if (!controller) {
      if (typeof Worker === "undefined") {
        if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
          recordWorkerFallback()
        workerDisabledRef.current = true
        solveSynchronously(input)
        return
      }
      try {
        const worker = new Worker(
          new URL("../utils/geometry/edgeGeometry.worker.ts", import.meta.url),
          {
            type: "module",
            name: "apollon-edge-geometry",
          }
        )
        controller = new EdgeGeometryWorkerController({
          sessionId: createEdgeGeometryWorkerSessionId(),
          worker,
          onResult: (result) => {
            if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
              mergeRoutingPerfCounters(result.perfDelta)
              recordSolve(result.durationMs)
              recordWorkerSolve()
            }
            const acceptedNodeGeometry = submittedNodeGeometryRef.current.get(
              result.revision
            )
            const geometryState = geometryStore?.getState()
            const prefersReducedMotion =
              typeof matchMedia === "function" &&
              matchMedia("(prefers-reduced-motion: reduce)").matches
            const settlement = prefersReducedMotion
              ? {}
              : prepareEdgeGeometrySettlement(
                  geometryState?.previewById ?? {},
                  result.routeById
                )
            const initialSettlementPreview = interpolateEdgeGeometrySettlement(
              settlement,
              0
            )
            setAllGeometry(
              result.routeById,
              acceptedNodeGeometry,
              initialSettlementPreview
            )
            releasedEdgePreviewRef.current = null
            provisionalRoutesRef.current = null
            provisionalNodeGeometryRef.current = null
            provisionalDecisionRef.current.clear()
            settledRoutesRef.current =
              geometryStore?.getState().geometryById ?? result.routeById
            settledNodeGeometryRef.current =
              acceptedNodeGeometry ?? settledNodeGeometryRef.current
            submittedNodeGeometryRef.current.clear()
            const transitionIds = Object.keys(settlement)
            if (transitionIds.length === 0) {
              geometryStore?.getState().setSolving(false)
              return
            }

            // Exact geometry is already authoritative for spatial consumers.
            // Keep only the rendered route on a short orthogonal handoff, then
            // clear it before resolving waitForSettled (exports cannot capture a
            // halfway display generation).
            const animationToken = ++settlementAnimationTokenRef.current
            const startedAt = performance.now()
            const animateSettlement = (now: number) => {
              if (animationToken !== settlementAnimationTokenRef.current) return
              const progress = Math.min(
                1,
                (now - startedAt) / EDGE_GEOMETRY_SETTLEMENT_DURATION_MS
              )
              if (progress >= 1) {
                settlementAnimationFrameRef.current = null
                geometryStore?.getState().clearPreviewGeometry()
                geometryStore?.getState().setSolving(false)
                return
              }
              setPreviewGeometry(
                interpolateEdgeGeometrySettlement(settlement, progress)
              )
              settlementAnimationFrameRef.current =
                requestAnimationFrame(animateSettlement)
            }
            settlementAnimationFrameRef.current =
              requestAnimationFrame(animateSettlement)
          },
          onProvisionalResult: (result) => {
            if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
              mergeRoutingPerfCounters(result.perfDelta)
              recordSolve(result.durationMs)
            }
            const submittedNodeGeometry = submittedNodeGeometryRef.current.get(
              result.revision
            )
            submittedNodeGeometryRef.current.delete(result.revision)
            if (!submittedNodeGeometry) return
            const latestInput = latestSolverInputRef.current
            const latestNodes = latestNodeGeometryRef.current
            if (!latestInput || !latestNodes) return
            const candidateAtPointer = projectRoutesWhileSolving(
              result.routeById,
              latestInput.edges,
              submittedNodeGeometry,
              latestNodes
            )
            const stabilization = stabilizeProvisionalRoutes({
              displayedById:
                geometryStore?.getState().previewById ??
                settledRoutesRef.current,
              candidateById: candidateAtPointer,
              edges: latestInput.edges,
              nodes: latestNodes,
              pendingDecisionById: provisionalDecisionRef.current,
            })
            if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
              recordPreviewDecisionStabilization(stabilization)
            // The version gate still prevents this sampled generation from
            // settling. Its coordinate refinements can flow immediately, while
            // a changed side/port/route decision must survive the next exact
            // sample before it replaces the display baseline.
            provisionalRoutesRef.current = stabilization.routeById
            provisionalNodeGeometryRef.current = latestNodes
            publishProjectedPreview(stabilization.routeById, latestNodes)
          },
          onFailure: fallbackToLatestSnapshot,
        })
        worker.onmessage = (event: MessageEvent<EdgeGeometryWorkerResponse>) =>
          controller?.receive(event.data)
        worker.onerror = (event) => {
          event.preventDefault()
          controller?.fail(
            `${event.message || "Edge geometry worker failed"} at ${
              event.filename || "worker"
            }:${event.lineno}:${event.colno}`
          )
        }
        worker.onmessageerror = () =>
          controller?.fail("Edge geometry worker message could not be cloned")
        workerRef.current = worker
        workerControllerRef.current = controller
        workerHasSubmittedRef.current = false
      } catch {
        if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
          recordWorkerFallback()
        workerDisabledRef.current = true
        solveSynchronously(input)
        return
      }
    }
    const submitLatestSnapshot = () => {
      scheduledWorkerSubmitRef.current = null
      if (workerDisabledRef.current) return
      const latestInput = latestSolverInputRef.current
      const latestNodeGeometry = latestNodeGeometryRef.current
      if (!latestInput || !latestNodeGeometry) return
      // Clone the full diagram only when a generation is actually dispatched.
      // Pointer frames only replace refs; the bounded-cadence timer serializes
      // the newest snapshot at most once per interval.
      const serialized = serializeSolverInput(latestInput)
      if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
        recordWorkerAttempt()
      const revision = controller.submit(
        serialized,
        workerHasSubmittedRef.current
          ? undefined
          : serializeEdgeSolveCache(solveCacheRef.current)
      )
      workerHasSubmittedRef.current = true
      if (!workerDisabledRef.current)
        submittedNodeGeometryRef.current.set(revision, latestNodeGeometry)
      // Replaced pending samples never receive a reply. Bound their snapshots;
      // even an unusually slow in-flight solve retains several seconds of
      // cadence history, while a missing old snapshot merely skips one preview.
      while (submittedNodeGeometryRef.current.size > 32) {
        const oldest = submittedNodeGeometryRef.current.keys().next().value
        if (oldest === undefined) break
        submittedNodeGeometryRef.current.delete(oldest)
      }
    }
    const interacting =
      nodeInteractionActive ||
      liveEdgeOverride !== null ||
      pendingConnectionEdge !== null
    if (
      shouldSampleEdgeGeometryWorker({
        edgeCount: solverEdges.length,
        interacting,
      })
    ) {
      // Mark an already-running generation unable to settle immediately, but
      // keep a successful result eligible as display-only progress. Do not
      // restart an existing timer on every pointer frame: that trailing-edge
      // debounce starved continuous gestures of every holistic generation.
      controller.supersede()
      if (scheduledWorkerSubmitRef.current === null)
        scheduledWorkerSubmitRef.current = setTimeout(
          submitLatestSnapshot,
          EDGE_GEOMETRY_WORKER_PREVIEW_CADENCE_MS
        )
    } else {
      clearScheduledWorkerSubmit()
      submitLatestSnapshot()
    }
    // `nodeGeometryKey` is the change trigger; `nodes`/`nodeLookup` are refs RF
    // mutates in place, so they never signal measurement on their own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    nodeGeometryKey,
    connectionMode,
    edges,
    nodeInteractionActive,
    liveEdgeOverride,
    pendingConnectionEdge,
    geometryStore,
    setAllGeometry,
    setPreviewGeometry,
  ])

  useLayoutEffect(
    () => () => {
      settlementAnimationTokenRef.current++
      if (settlementAnimationFrameRef.current !== null) {
        cancelAnimationFrame(settlementAnimationFrameRef.current)
        settlementAnimationFrameRef.current = null
      }
      if (scheduledWorkerSubmitRef.current !== null) {
        clearTimeout(scheduledWorkerSubmitRef.current)
        scheduledWorkerSubmitRef.current = null
      }
      workerControllerRef.current?.dispose()
      workerControllerRef.current = null
      workerRef.current = null
      workerHasSubmittedRef.current = false
      latestSolverInputRef.current = null
      latestNodeGeometryRef.current = null
      submittedNodeGeometryRef.current.clear()
      provisionalRoutesRef.current = null
      provisionalNodeGeometryRef.current = null
      provisionalDecisionRef.current.clear()
      activeEdgeGestureRef.current = null
      releasedEdgePreviewRef.current = null
      geometryStore?.getState().clearPreviewGeometry()
      geometryStore?.getState().setSolving(false)
    },
    [geometryStore]
  )

  return null
}
