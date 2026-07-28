import { use, useLayoutEffect, useRef } from "react"
import { useNodesInitialized, useStore, type InternalNode } from "@xyflow/react"
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
  EdgeGeometryWorkerController,
  createEdgeGeometryWorkerSessionId,
  getEdgeGeometryWorkerCadence,
  shouldSampleEdgeGeometryWorker,
  shouldUseEdgeGeometryWorker,
  updateEdgeGeometryWorkerRoundTrip,
} from "@/utils/geometry/edgeGeometryWorkerController"
import {
  serializeEdgeSolveCache,
  serializeSolverInput,
  type EdgeGeometrySolveResult,
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
  recordWorkerDispatch,
  recordWorkerFallback,
  recordWorkerHolisticPreview,
  recordWorkerReleaseExact,
  recordWorkerReleaseSettled,
  recordWorkerResponse,
  recordWorkerRevision,
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
 * use a backpressured Worker scheduler. During interaction, superseded exact
 * solves may improve the display-only preview, but cannot commit obsolete drag
 * geometry.
 *
 * Display projections are published separately from accepted geometry. Routes
 * and their line jumps follow the pointer together, while exact consumers such
 * as export and label placement keep the settled holistic snapshot.
 */
export const EdgeGeometrySolver = () => {
  const nodes = useStore((s) => s.nodes)
  const nodeLookup = useStore(
    (s) => s.nodeLookup as unknown as Map<string, InternalNode>
  )
  const connectionMode = useStore((s) => s.connectionMode)
  const nodesInitialized = useNodesInitialized()
  const visibleHandleBoundsInitialized = useStore((state) => {
    let hasVisibleNodes = false
    for (const node of state.nodeLookup.values()) {
      if (node.hidden) continue
      hasVisibleNodes = true
      if (node.internals.handleBounds === undefined) return false
    }
    return hasVisibleNodes
  })
  const { edges, visibleDiagramNodeCount, nodeInteractionActive } =
    useDiagramStore(
      useShallow((state) => ({
        edges: state.edges,
        visibleDiagramNodeCount: state.nodes.filter((node) => !node.hidden)
          .length,
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
  const routingEpoch = useEdgeGeometryStore((s) => s.routingEpoch)
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
  const activeRoutingEpochRef = useRef<number | null>(null)
  const workerDisabledRef = useRef(false)
  const workerControllerRef = useRef<EdgeGeometryWorkerController | null>(null)
  const workerHasSubmittedRef = useRef(false)
  const scheduledWorkerSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const submitLatestWorkerSnapshotRef = useRef<(() => void) | null>(null)
  const latestSolverInputRef = useRef<SolverInput | null>(null)
  const latestNodeGeometryRef = useRef<EdgeGeometryNodeSnapshot | null>(null)
  const latestSnapshotAtRef = useRef(0)
  const latestSnapshotRevisionRef = useRef(0)
  const latestSnapshotDirtyRef = useRef(false)
  const lastWorkerDispatchAtRef = useRef(0)
  const workerRoundTripRef = useRef<number | null>(null)
  const workerRequestTimingRef = useRef(
    new Map<
      number,
      { dispatchedAt: number; snapshotAt: number; snapshotRevision: number }
    >()
  )
  const interactionActiveRef = useRef(false)
  const nodeInteractionActiveRef = useRef(false)
  const interactionStartedAtRef = useRef<number | null>(null)
  const lastHolisticPreviewAtRef = useRef<number | null>(null)
  const releaseStartedAtRef = useRef<number | null>(null)
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
    if (activeRoutingEpochRef.current !== routingEpoch) {
      activeRoutingEpochRef.current = routingEpoch
      clearScheduledWorkerSubmit()
      workerControllerRef.current?.dispose()
      workerControllerRef.current = null
      workerHasSubmittedRef.current = false
      workerDisabledRef.current = false
      submitLatestWorkerSnapshotRef.current = null
      hasRunInitialSolveRef.current = false
      solveCacheRef.current.clear()
      settledRoutesRef.current = {}
      settledNodeGeometryRef.current = null
      provisionalRoutesRef.current = null
      provisionalNodeGeometryRef.current = null
      provisionalDecisionRef.current.clear()
      submittedNodeGeometryRef.current.clear()
      workerRequestTimingRef.current.clear()
    }
    // React Flow can publish a partial nodeLookup while it measures the initial
    // canvas. Do not consume the one synchronous first solve on that incomplete
    // obstacle field: use its readiness signal so the first routes users see
    // are computed from every visible node's measured dimensions.
    if (
      !hasRunInitialSolveRef.current &&
      visibleDiagramNodeCount > 0 &&
      (!nodesInitialized || !visibleHandleBoundsInitialized)
    )
      return

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
    latestSnapshotAtRef.current = performance.now()
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
    const interacting =
      nodeInteractionActive ||
      liveEdgeOverride !== null ||
      pendingConnectionEdge !== null
    const nodeInteractionJustReleased =
      nodeInteractionActiveRef.current && !nodeInteractionActive
    const interactionChangedAt = performance.now()
    if (!interactionActiveRef.current && interacting) {
      interactionStartedAtRef.current = interactionChangedAt
      lastHolisticPreviewAtRef.current = null
      releaseStartedAtRef.current = null
    } else if (interactionActiveRef.current && !interacting)
      releaseStartedAtRef.current = interactionChangedAt
    interactionActiveRef.current = interacting
    nodeInteractionActiveRef.current = nodeInteractionActive

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
      const geometryState = geometryStore?.getState()
      const stabilization = interacting
        ? stabilizeProvisionalRoutes({
            displayedById:
              Object.keys(geometryState?.previewById ?? {}).length > 0
                ? (geometryState?.previewById ?? {})
                : (geometryState?.geometryById ?? {}),
            candidateById: routeById,
            // Synchronous hysteresis is new for the automatically routed
            // straight-polyline families. Keep legacy step-edge interaction
            // immediate: required-interface socket bundling, reconnect previews,
            // and other route-sensitive adornments rely on the exact live route.
            // Large-diagram Worker previews retain their existing holistic
            // stabilization below.
            edges: solveInput.edges.filter((edge) =>
              STRAIGHT_HOOK_EDGE_TYPES.has(edge.type ?? "")
            ),
            nodes: acceptedNodeGeometry,
            pendingDecisionById: provisionalDecisionRef.current,
          })
        : null
      if (!interacting) provisionalDecisionRef.current.clear()
      if (
        !setAllGeometry(
          routeById,
          routingEpoch,
          acceptedNodeGeometry,
          stabilization?.routeById
        )
      )
        return
      releasedEdgePreviewRef.current = null
      provisionalRoutesRef.current = null
      provisionalNodeGeometryRef.current = null
      settledRoutesRef.current =
        geometryStore?.getState().geometryById ?? routeById
      settledNodeGeometryRef.current = acceptedNodeGeometry
      submittedNodeGeometryRef.current.clear()
      workerRequestTimingRef.current.clear()
      latestSnapshotDirtyRef.current = false
      releaseStartedAtRef.current = null
      geometryStore?.getState().setSolving(false)
    }

    const hasStraightHookEdges = solverEdges.some((edge) =>
      STRAIGHT_HOOK_EDGE_TYPES.has(edge.type ?? "")
    )
    const forceStraightInteractionWorker =
      hasStraightHookEdges &&
      (nodeInteractionActive || nodeInteractionJustReleased)
    const useWorker = shouldUseEdgeGeometryWorker({
      hasRunInitialSolve: hasRunInitialSolveRef.current,
      edgeCount: solverEdges.length,
      threshold: EDGE_GEOMETRY_WORKER_EDGE_THRESHOLD,
      disabled: workerDisabledRef.current,
      force: forceStraightInteractionWorker,
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
    const snapshotRevision = ++latestSnapshotRevisionRef.current
    if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
      recordWorkerRevision("input", snapshotRevision)
    latestSnapshotDirtyRef.current = true

    // Keep every settled route attached to its moving/resizing endpoints while
    // the Worker proves the new optimum. This projection is display-only and
    // preserves each edge family's path geometry; the accepted exact generation
    // replaces it atomically.
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
            latestNodes,
            STRAIGHT_HOOK_EDGE_TYPES
          )
        : baseRoutes
      const currentOverride = latestInput.liveOverride
      const releasedEdgePreview = releasedEdgePreviewRef.current
      setPreviewGeometry(
        currentOverride
          ? {
              ...pendingGeometry,
              [currentOverride.edgeId]:
                currentOverride.strategy === "predicted"
                  ? (pendingGeometry[currentOverride.edgeId] ??
                    currentOverride.points)
                  : currentOverride.points,
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
      controller?.dispose()
      const latest = latestSolverInputRef.current
      if (latest) solveSynchronously(latest)
    }

    const observeWorkerResult = (result: EdgeGeometrySolveResult) => {
      const receivedAt = performance.now()
      const timing = workerRequestTimingRef.current.get(result.revision)
      workerRequestTimingRef.current.delete(result.revision)
      if (timing) {
        const roundTripMs = receivedAt - timing.dispatchedAt
        workerRoundTripRef.current = updateEdgeGeometryWorkerRoundTrip(
          workerRoundTripRef.current,
          roundTripMs
        )
        if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
          recordWorkerResponse(roundTripMs, receivedAt - timing.snapshotAt)
      }
      if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
        mergeRoutingPerfCounters(result.perfDelta)
        recordSolve(result.durationMs)
      }
      return { receivedAt, snapshotRevision: timing?.snapshotRevision }
    }

    const observeHolisticPreview = (now: number) => {
      if (!interactionActiveRef.current) return
      const interactionStartedAt = interactionStartedAtRef.current
      const previousPreviewAt = lastHolisticPreviewAtRef.current
      if (
        (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") &&
        interactionStartedAt !== null
      )
        recordWorkerHolisticPreview(
          previousPreviewAt === null ? now - interactionStartedAt : null,
          previousPreviewAt === null ? null : now - previousPreviewAt
        )
      lastHolisticPreviewAtRef.current = now
    }

    const publishWorkerInteractionResult = (
      result: EdgeGeometrySolveResult
    ) => {
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
        latestNodes,
        STRAIGHT_HOOK_EDGE_TYPES
      )
      const stabilization = stabilizeProvisionalRoutes({
        displayedById:
          geometryStore?.getState().previewById ?? settledRoutesRef.current,
        candidateById: candidateAtPointer,
        edges: latestInput.edges,
        nodes: latestNodes,
        pendingDecisionById: provisionalDecisionRef.current,
        holdDecisionEdgeTypes: nodeInteractionActiveRef.current
          ? STRAIGHT_HOOK_EDGE_TYPES
          : undefined,
      })
      if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
        recordPreviewDecisionStabilization(stabilization)
      provisionalRoutesRef.current = stabilization.routeById
      provisionalNodeGeometryRef.current = latestNodes
      publishProjectedPreview(stabilization.routeById, latestNodes)
      observeHolisticPreview(performance.now())
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
            const { receivedAt, snapshotRevision } = observeWorkerResult(result)
            if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
              if (snapshotRevision !== undefined)
                recordWorkerRevision("accepted", snapshotRevision)
              recordWorkerSolve()
            }
            // A current Worker response may arrive while the pointer merely
            // pauses. Treat it as a display refinement, not as permission to
            // reorganize valid straight routes mid-gesture. Pointer-up submits
            // one final exact generation which settles normally below.
            if (nodeInteractionActiveRef.current) {
              publishWorkerInteractionResult(result)
              return
            }
            const releaseStartedAt = releaseStartedAtRef.current
            if (releaseStartedAt !== null)
              recordWorkerReleaseExact(receivedAt - releaseStartedAt)
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
            if (
              !setAllGeometry(
                result.routeById,
                routingEpoch,
                acceptedNodeGeometry,
                initialSettlementPreview
              )
            )
              return
            observeHolisticPreview(receivedAt)
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
              if (releaseStartedAt !== null) {
                recordWorkerReleaseSettled(receivedAt - releaseStartedAt)
                releaseStartedAtRef.current = null
              }
              geometryStore?.getState().setSolving(false)
              return
            }

            // Exact geometry is already authoritative for exact consumers.
            // Keep rendered routes and their jumps on a short orthogonal
            // handoff, then clear it before resolving waitForSettled (exports
            // cannot capture a halfway display generation).
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
                if (releaseStartedAt !== null) {
                  recordWorkerReleaseSettled(now - releaseStartedAt)
                  releaseStartedAtRef.current = null
                }
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
            observeWorkerResult(result)
            // The version gate still prevents this sampled generation from
            // settling. Its coordinate refinements can flow immediately, while
            // straight routes keep valid topology for the complete node gesture.
            publishWorkerInteractionResult(result)
          },
          onFailure: fallbackToLatestSnapshot,
          onIdle: () => submitLatestWorkerSnapshotRef.current?.(),
          onResponse: (response) => {
            if (response.kind === "result") return
            workerRequestTimingRef.current.delete(response.revision)
            submittedNodeGeometryRef.current.delete(response.revision)
          },
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
    const scheduleLatestSnapshot = () => {
      if (
        scheduledWorkerSubmitRef.current !== null ||
        workerDisabledRef.current ||
        !latestSnapshotDirtyRef.current
      )
        return
      if (!controller.isIdle()) return

      const cadence = interactionActiveRef.current
        ? getEdgeGeometryWorkerCadence(workerRoundTripRef.current)
        : 0
      const delay = Math.max(
        0,
        lastWorkerDispatchAtRef.current + cadence - performance.now()
      )
      // Even a zero-delay settle moves to a later task, letting this layout
      // effect publish its cheap projection and return before serialization.
      scheduledWorkerSubmitRef.current = setTimeout(() => {
        scheduledWorkerSubmitRef.current = null
        if (
          workerDisabledRef.current ||
          !latestSnapshotDirtyRef.current ||
          !controller.isIdle()
        )
          return
        const latestInput = latestSolverInputRef.current
        const latestNodeGeometry = latestNodeGeometryRef.current
        if (!latestInput || !latestNodeGeometry) return

        const snapshotAt = latestSnapshotAtRef.current
        const snapshotRevision = latestSnapshotRevisionRef.current
        const serializeStartedAt = performance.now()
        const serialized = serializeSolverInput(latestInput)
        const initialCache = workerHasSubmittedRef.current
          ? undefined
          : serializeEdgeSolveCache(solveCacheRef.current)
        const serializedAt = performance.now()
        latestSnapshotDirtyRef.current = false
        if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
          recordWorkerAttempt()
        const dispatchedAt = performance.now()
        const revision = controller.submit(serialized, initialCache)
        const postedAt = performance.now()
        if (revision === null) {
          latestSnapshotDirtyRef.current = true
          return
        }
        if (workerDisabledRef.current) return
        workerHasSubmittedRef.current = true
        lastWorkerDispatchAtRef.current = dispatchedAt
        workerRequestTimingRef.current.set(revision, {
          dispatchedAt,
          snapshotAt,
          snapshotRevision,
        })
        if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
          recordWorkerRevision("dispatch", snapshotRevision)
        }
        submittedNodeGeometryRef.current.set(revision, latestNodeGeometry)
        if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
          recordWorkerDispatch(
            serializedAt - serializeStartedAt,
            postedAt - dispatchedAt
          )
      }, delay)
    }
    submitLatestWorkerSnapshotRef.current = scheduleLatestSnapshot

    // Every new geometry input invalidates an older in-flight exact generation
    // before its lazily serialized replacement is dispatched.
    controller.supersede()
    if (
      shouldSampleEdgeGeometryWorker({
        edgeCount: solverEdges.length,
        interacting,
        force: forceStraightInteractionWorker,
      })
    ) {
      // Keep the earliest timer instead of restarting it on every pointer frame.
      // Actual preview throughput remains bounded by Worker solve duration.
      scheduleLatestSnapshot()
    } else {
      clearScheduledWorkerSubmit()
      scheduleLatestSnapshot()
    }
    // `nodeGeometryKey` is the change trigger; `nodes`/`nodeLookup` are refs RF
    // mutates in place, so they never signal measurement on their own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    nodeGeometryKey,
    routingEpoch,
    nodesInitialized,
    visibleHandleBoundsInitialized,
    visibleDiagramNodeCount,
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
      workerHasSubmittedRef.current = false
      submitLatestWorkerSnapshotRef.current = null
      latestSolverInputRef.current = null
      latestNodeGeometryRef.current = null
      latestSnapshotDirtyRef.current = false
      workerRequestTimingRef.current.clear()
      interactionActiveRef.current = false
      nodeInteractionActiveRef.current = false
      interactionStartedAtRef.current = null
      lastHolisticPreviewAtRef.current = null
      releaseStartedAtRef.current = null
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
