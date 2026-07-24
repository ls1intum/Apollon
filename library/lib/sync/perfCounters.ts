// Dev/test-only performance counters, gated on `import.meta.env.DEV` OR the e2e
// build (`VITE_E2E`) — both statically false in a real production build and in
// the standalone library dist (no VITE_E2E), so the module dead-code-eliminates
// there (enforced by scripts/check-no-perf-hooks.mjs). The webapp consumes the
// library from source, so its `VITE_E2E=true` build keeps these live for the
// perf suite (`window.__apollonPerf`). Inline (not a shared const) so it both
// DCEs and re-evaluates under `vi.stubEnv`.
export type PerfCounters = {
  storeNodeWrites: number
  /** Counting exact routing work lets tests guard algorithmic scaling on any
   * machine; a stopwatch alone only measures that machine. */
  routerSearches: number
  routerExpansions: number
  /** The worst single search. A mean over a hundred edges hides the one edge that
   * costs a hundred times the rest — which is precisely the edge that drops the
   * frame, and precisely the one a budget needs to catch. */
  routerMaxExpansions: number
  /** Searches that hit their work budget and fell back to a plain step route. */
  routerAbandoned: number
  /** Wall-clock inside exact A* searches. Diagnostic only; operation-count
   * budgets remain the cross-machine regression guard. */
  routerSearchMs: number
  routerSearchMaxMs: number
  routerSetupMs: number
  routerLoopMs: number
  routerStepPricings: number
  routerHeuristicEvaluations: number
  routerHeapPushes: number
  /** Incremental exact-search diagnostics: a prior route was feasible under the
   * current costs, and states rejected because their admissible lower bound was
   * already strictly worse than that route. */
  routerIncumbentBounds: number
  routerBoundPrunes: number
  /** Size of the largest cost-event lattice presented to a search. This remains
   * useful while the dense oracle and sparse fast paths coexist. */
  routerMaxCells: number
  /** Route pairs evaluated by whole-set/component refinement scoring. This guards
   * the orchestration cost that router-search counters cannot see. */
  routeScorePairs: number
  routeScoreMs: number
  routeScoreRuns: number
  /** Wall-clock spent in `computeAllEdgeGeometry`, including accepted Worker
   * generations. Reported separately from foreground frame time: a slow
   * background proof need not be a dropped interaction frame. Machine-specific,
   * so it informs local benchmarking, while expansion counters above provide the
   * cross-machine regression budget. */
  solveMs: number
  solveMaxMs: number
  solveCount: number
  workerSolveCount: number
  workerResponseCount: number
  workerAttemptCount: number
  workerFallbackCount: number
  workerInitialSyncCount: number
  workerSmallSyncCount: number
  workerSerializeMaxMs: number
  workerPostMessageMaxMs: number
  workerRoundTripMaxMs: number
  workerDispatchDelayMaxMs: number
  workerSnapshotAgeMaxMs: number
  workerReleaseExactMaxMs: number
  workerReleaseSettledMaxMs: number
  workerHolisticPreviewCount: number
  workerFirstPreviewMaxMs: number
  workerPreviewGapMaxMs: number
  workerLatestInputRevision: number
  workerLastDispatchedRevision: number
  workerLastAcceptedRevision: number
  /** Preview-only stability decisions. A held choice is a stale sampled
   * side/port/topology change that did not yet repeat; a confirmation adopts it,
   * while an invalidation adopts immediately because the displayed route now
   * crosses a node. */
  previewDecisionHoldCount: number
  previewDecisionConfirmCount: number
  previewDecisionInvalidationCount: number
  /** Render invocations of routed edge hooks. Used by the browser pressure
   * test to distinguish routing work from subscription/render fan-out. */
  edgeRenderCount: number
}

export type RoutingPerfCounters = Pick<
  PerfCounters,
  | "routerSearches"
  | "routerExpansions"
  | "routerMaxExpansions"
  | "routerAbandoned"
  | "routerSearchMs"
  | "routerSearchMaxMs"
  | "routerSetupMs"
  | "routerLoopMs"
  | "routerStepPricings"
  | "routerHeuristicEvaluations"
  | "routerHeapPushes"
  | "routerIncumbentBounds"
  | "routerBoundPrunes"
  | "routerMaxCells"
  | "routeScorePairs"
  | "routeScoreMs"
  | "routeScoreRuns"
>

export const perfCounters: PerfCounters =
  import.meta.env.DEV || import.meta.env.VITE_E2E === "true"
    ? {
        storeNodeWrites: 0,
        routerSearches: 0,
        routerExpansions: 0,
        routerMaxExpansions: 0,
        routerAbandoned: 0,
        routerSearchMs: 0,
        routerSearchMaxMs: 0,
        routerSetupMs: 0,
        routerLoopMs: 0,
        routerStepPricings: 0,
        routerHeuristicEvaluations: 0,
        routerHeapPushes: 0,
        routerIncumbentBounds: 0,
        routerBoundPrunes: 0,
        routerMaxCells: 0,
        routeScorePairs: 0,
        routeScoreMs: 0,
        routeScoreRuns: 0,
        solveMs: 0,
        solveMaxMs: 0,
        solveCount: 0,
        workerSolveCount: 0,
        workerResponseCount: 0,
        workerAttemptCount: 0,
        workerFallbackCount: 0,
        workerInitialSyncCount: 0,
        workerSmallSyncCount: 0,
        workerSerializeMaxMs: 0,
        workerPostMessageMaxMs: 0,
        workerRoundTripMaxMs: 0,
        workerDispatchDelayMaxMs: 0,
        workerSnapshotAgeMaxMs: 0,
        workerReleaseExactMaxMs: 0,
        workerReleaseSettledMaxMs: 0,
        workerHolisticPreviewCount: 0,
        workerFirstPreviewMaxMs: 0,
        workerPreviewGapMaxMs: 0,
        workerLatestInputRevision: 0,
        workerLastDispatchedRevision: 0,
        workerLastAcceptedRevision: 0,
        previewDecisionHoldCount: 0,
        previewDecisionConfirmCount: 0,
        previewDecisionInvalidationCount: 0,
        edgeRenderCount: 0,
      }
    : (undefined as unknown as PerfCounters)

export const getPerfCounters = (): PerfCounters | undefined =>
  import.meta.env.DEV || import.meta.env.VITE_E2E === "true"
    ? perfCounters
    : undefined

export const recordStoreNodeWrite = () => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
    perfCounters.storeNodeWrites++
}

/** One whole-canvas solve, in milliseconds. Positive guard so it DCEs in prod. */
export const recordSolve = (ms: number): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
    perfCounters.solveMs += ms
    perfCounters.solveCount++
    if (ms > perfCounters.solveMaxMs) perfCounters.solveMaxMs = ms
  }
}

export const recordWorkerSolve = (): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
    perfCounters.workerSolveCount++
}

export const recordWorkerAttempt = (): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
    perfCounters.workerAttemptCount++
}

export const recordWorkerFallback = (): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
    perfCounters.workerFallbackCount++
}

export const recordWorkerSyncDecision = (reason: "initial" | "small"): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
    if (reason === "initial") perfCounters.workerInitialSyncCount++
    else perfCounters.workerSmallSyncCount++
  }
}

export const recordWorkerDispatch = (
  serializeMs: number,
  postMessageMs: number
): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
    perfCounters.workerSerializeMaxMs = Math.max(
      perfCounters.workerSerializeMaxMs,
      serializeMs
    )
    perfCounters.workerPostMessageMaxMs = Math.max(
      perfCounters.workerPostMessageMaxMs,
      postMessageMs
    )
  }
}

export const recordWorkerResponse = (
  roundTripMs: number,
  snapshotAgeMs: number
): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
    perfCounters.workerResponseCount++
    perfCounters.workerRoundTripMaxMs = Math.max(
      perfCounters.workerRoundTripMaxMs,
      roundTripMs
    )
    perfCounters.workerDispatchDelayMaxMs = Math.max(
      perfCounters.workerDispatchDelayMaxMs,
      snapshotAgeMs - roundTripMs
    )
    perfCounters.workerSnapshotAgeMaxMs = Math.max(
      perfCounters.workerSnapshotAgeMaxMs,
      snapshotAgeMs
    )
  }
}

export const recordWorkerReleaseExact = (elapsedMs: number): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
    perfCounters.workerReleaseExactMaxMs = Math.max(
      perfCounters.workerReleaseExactMaxMs,
      elapsedMs
    )
}

export const recordWorkerReleaseSettled = (elapsedMs: number): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
    perfCounters.workerReleaseSettledMaxMs = Math.max(
      perfCounters.workerReleaseSettledMaxMs,
      elapsedMs
    )
}

export const recordWorkerHolisticPreview = (
  firstDelayMs: number | null,
  gapMs: number | null
): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
    perfCounters.workerHolisticPreviewCount++
    if (firstDelayMs !== null)
      perfCounters.workerFirstPreviewMaxMs = Math.max(
        perfCounters.workerFirstPreviewMaxMs,
        firstDelayMs
      )
    if (gapMs !== null)
      perfCounters.workerPreviewGapMaxMs = Math.max(
        perfCounters.workerPreviewGapMaxMs,
        gapMs
      )
  }
}

export const recordWorkerRevision = (
  kind: "input" | "dispatch" | "accepted",
  revision: number
): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
    if (kind === "input") perfCounters.workerLatestInputRevision = revision
    else if (kind === "dispatch")
      perfCounters.workerLastDispatchedRevision = revision
    else perfCounters.workerLastAcceptedRevision = revision
  }
}

export const recordPreviewDecisionStabilization = ({
  heldDecisionCount,
  confirmedDecisionCount,
  invalidatedDecisionCount,
}: {
  heldDecisionCount: number
  confirmedDecisionCount: number
  invalidatedDecisionCount: number
}): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
    perfCounters.previewDecisionHoldCount += heldDecisionCount
    perfCounters.previewDecisionConfirmCount += confirmedDecisionCount
    perfCounters.previewDecisionInvalidationCount += invalidatedDecisionCount
  }
}

export const recordEdgeRender = (): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
    perfCounters.edgeRenderCount++
}

/** Snapshot only the counters routing work inside a Web Worker can increment. */
export const getRoutingPerfCounters = (): RoutingPerfCounters | undefined =>
  import.meta.env.DEV || import.meta.env.VITE_E2E === "true"
    ? {
        routerSearches: perfCounters.routerSearches,
        routerExpansions: perfCounters.routerExpansions,
        routerMaxExpansions: perfCounters.routerMaxExpansions,
        routerAbandoned: perfCounters.routerAbandoned,
        routerSearchMs: perfCounters.routerSearchMs,
        routerSearchMaxMs: perfCounters.routerSearchMaxMs,
        routerSetupMs: perfCounters.routerSetupMs,
        routerLoopMs: perfCounters.routerLoopMs,
        routerStepPricings: perfCounters.routerStepPricings,
        routerHeuristicEvaluations: perfCounters.routerHeuristicEvaluations,
        routerHeapPushes: perfCounters.routerHeapPushes,
        routerIncumbentBounds: perfCounters.routerIncumbentBounds,
        routerBoundPrunes: perfCounters.routerBoundPrunes,
        routerMaxCells: perfCounters.routerMaxCells,
        routeScorePairs: perfCounters.routeScorePairs,
        routeScoreMs: perfCounters.routeScoreMs,
        routeScoreRuns: perfCounters.routeScoreRuns,
      }
    : undefined

export const diffRoutingPerfCounters = (
  before: RoutingPerfCounters | undefined,
  after: RoutingPerfCounters | undefined
): RoutingPerfCounters | undefined => {
  if (!before || !after) return undefined
  return {
    routerSearches: after.routerSearches - before.routerSearches,
    routerExpansions: after.routerExpansions - before.routerExpansions,
    routerMaxExpansions: after.routerMaxExpansions,
    routerAbandoned: after.routerAbandoned - before.routerAbandoned,
    routerSearchMs: after.routerSearchMs - before.routerSearchMs,
    routerSearchMaxMs: after.routerSearchMaxMs,
    routerSetupMs: after.routerSetupMs - before.routerSetupMs,
    routerLoopMs: after.routerLoopMs - before.routerLoopMs,
    routerStepPricings: after.routerStepPricings - before.routerStepPricings,
    routerHeuristicEvaluations:
      after.routerHeuristicEvaluations - before.routerHeuristicEvaluations,
    routerHeapPushes: after.routerHeapPushes - before.routerHeapPushes,
    routerIncumbentBounds:
      after.routerIncumbentBounds - before.routerIncumbentBounds,
    routerBoundPrunes: after.routerBoundPrunes - before.routerBoundPrunes,
    routerMaxCells: after.routerMaxCells,
    routeScorePairs: after.routeScorePairs - before.routeScorePairs,
    routeScoreMs: after.routeScoreMs - before.routeScoreMs,
    routeScoreRuns: after.routeScoreRuns - before.routeScoreRuns,
  }
}

/** Merge a completed Worker's isolated routing counters into main instrumentation. */
export const mergeRoutingPerfCounters = (
  delta: RoutingPerfCounters | undefined
): void => {
  if ((import.meta.env.DEV || import.meta.env.VITE_E2E === "true") && delta) {
    perfCounters.routerSearches += delta.routerSearches
    perfCounters.routerExpansions += delta.routerExpansions
    perfCounters.routerMaxExpansions = Math.max(
      perfCounters.routerMaxExpansions,
      delta.routerMaxExpansions
    )
    perfCounters.routerAbandoned += delta.routerAbandoned
    perfCounters.routerSearchMs += delta.routerSearchMs
    perfCounters.routerSearchMaxMs = Math.max(
      perfCounters.routerSearchMaxMs,
      delta.routerSearchMaxMs
    )
    perfCounters.routerSetupMs += delta.routerSetupMs
    perfCounters.routerLoopMs += delta.routerLoopMs
    perfCounters.routerStepPricings += delta.routerStepPricings
    perfCounters.routerHeuristicEvaluations += delta.routerHeuristicEvaluations
    perfCounters.routerHeapPushes += delta.routerHeapPushes
    perfCounters.routerIncumbentBounds += delta.routerIncumbentBounds
    perfCounters.routerBoundPrunes += delta.routerBoundPrunes
    perfCounters.routerMaxCells = Math.max(
      perfCounters.routerMaxCells,
      delta.routerMaxCells
    )
    perfCounters.routeScorePairs += delta.routeScorePairs
    perfCounters.routeScoreMs += delta.routeScoreMs
    perfCounters.routeScoreRuns += delta.routeScoreRuns
  }
}

/** One completed search. Recorded ONCE, at whichever way the search exits, so an
 * abandoned run cannot go uncounted while its expansions do — the counter would
 * then be quietest exactly where it should be loudest. */
export const recordRouterSearch = (
  expansions: number,
  abandoned: boolean,
  elapsedMs = 0,
  setupMs = 0,
  stepPricings = 0,
  heuristicEvaluations = 0,
  heapPushes = 0,
  incumbentBound = false,
  boundPrunes = 0,
  cells = 0
): void => {
  // A positive guard, like `recordStoreNodeWrite` above — not an early return on
  // the negation. The bundler folds `if (false) { ... }` away entirely; it does not
  // strip the statements after an `if (true) return`, so the counter object stays
  // referenced and reaches the production chunk. check-no-perf-hooks.mjs caught it.
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
    perfCounters.routerSearches++
    perfCounters.routerExpansions += expansions
    if (expansions > perfCounters.routerMaxExpansions) {
      perfCounters.routerMaxExpansions = expansions
    }
    if (abandoned) perfCounters.routerAbandoned++
    perfCounters.routerSearchMs += elapsedMs
    if (elapsedMs > perfCounters.routerSearchMaxMs)
      perfCounters.routerSearchMaxMs = elapsedMs
    perfCounters.routerSetupMs += setupMs
    perfCounters.routerLoopMs += Math.max(0, elapsedMs - setupMs)
    perfCounters.routerStepPricings += stepPricings
    perfCounters.routerHeuristicEvaluations += heuristicEvaluations
    perfCounters.routerHeapPushes += heapPushes
    if (incumbentBound) perfCounters.routerIncumbentBounds++
    perfCounters.routerBoundPrunes += boundPrunes
    if (cells > perfCounters.routerMaxCells) perfCounters.routerMaxCells = cells
  }
}

/** One pair compared by the route-set objective. Kept separate from A* work so
 * tests can prove a small conflict does not trigger repeated O(E²) rescans. */
export const recordRouteScorePair = (): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true")
    perfCounters.routeScorePairs++
}

/** One complete route-set score, timed separately from its deterministic pair
 * count so local profiles can distinguish orchestration from exact A*. */
export const recordRouteScoreRun = (elapsedMs: number): void => {
  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "true") {
    perfCounters.routeScoreMs += elapsedMs
    perfCounters.routeScoreRuns++
  }
}
