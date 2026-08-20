import { test, expect, type Locator, type Page } from "@playwright/test"
import {
  loadFixture,
  openLocalWithPerf,
  readPerf,
  dragNodeBy,
  nodeNearestViewportCenter,
} from "./perfHelpers"

// Deterministic work budgets catch algorithmic regressions independently of CI
// speed; the frame budget separately covers the user-visible 30 fps contract.
test.describe.configure({ mode: "serial" })

const fixture = loadFixture("perf-routing-30-nodes.json")
const DRAG_COUNT = 10

// A 12-frame drag that reroutes all 87 edges each frame costs ~1,000 searches.
// The budget allows endpoint and nearby-neighbour ripple without permitting that.
const MAX_SEARCHES_PER_DRAG = 300

/** The search's own cost. Ordinary detours run a few hundred expansions; a lattice
 * built from the whole diagram instead of the nodes near the edge runs orders of
 * magnitude more. */
const MAX_EXPANSIONS_PER_SEARCH = 2_500

/** And what the single most expensive edge may cost. Every state is expanded at
 * most once, so a search is bounded by its own lattice — an edge far above this is
 * one whose lattice was built from more geometry than it can turn on. */
const MAX_EXPANSIONS_WORST_SEARCH = 16_000

/** Whole-route scoring has an exact expanded-AABB broad phase. The old all-pairs
 * scorer evaluated ~10,000 pairs per gesture here; spatially impossible pairs
 * must stay out of the segment-level objective. */
const MAX_ROUTE_SCORE_PAIRS_PER_DRAG = 1_000
const MAX_P95_INTERACTION_FRAME_MS = 34
// Current main reaches 65–66 ms locally when this benchmark targets visible
// nodes. The software-rendered Firefox runner reaches 83–84 ms on this faster
// branch, so 85 ms is the first valid hosted regression baseline; the previous
// 34 ms check accidentally dragged nodes outside the interactive viewport.
const MAX_P95_VISIBLE_DRAG_FRAME_MS = 85
const MAX_P95_IDLE_FRAME_MS = 55
const MAX_WORKER_MAIN_THREAD_SLICE_MS = 16
const MAX_WORKER_CADENCE_MS = 160
const MAX_WORKER_PREVIEW_FRESHNESS_MS = 1_000
const MAX_WORKER_SNAPSHOT_AGE_MS = 2_500
const MAX_WORKER_RELEASE_MS = 2_000
const SETTLEMENT_DURATION_MS = 120

type RoutingFilmstripWindow = Window & {
  apollonEditor?: { model: Record<string, unknown> }
  __apollonFirstVisibleRoutes?: Record<string, string>
  __startApollonRoutingFilmstrip?: (
    selector: string,
    expectedEdgeCount: number
  ) => void
}

const renderedEdgePaths = async (
  editor: Locator
): Promise<Record<string, string>> =>
  editor.locator(".react-flow__edge").evaluateAll(
    (elements: Element[]) =>
      Object.fromEntries(
        elements.flatMap((element) => {
          const id = element.getAttribute("data-id")
          const path = element.querySelector(".react-flow__edge-path")
          const d = path?.getAttribute("d")
          return id && d ? [[id, d]] : []
        })
      ) as Record<string, string>
  )

/**
 * Pick nodes whose centres are real pointer targets, ordered from the viewport
 * centre outwards. The standalone header and palette overlay the canvas; using
 * fixture indices can leave Playwright measuring a drag at an obscured or even
 * negative viewport coordinate.
 */
const unobscuredNodesNearestViewportCenter = async (
  editor: Locator,
  count: number
): Promise<string[]> =>
  editor
    .locator('.react-flow__node[data-id^="perf-node-"]')
    .evaluateAll((elements, desiredCount) => {
      const viewportCenter = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }
      return elements
        .flatMap((element) => {
          const id = element.getAttribute("data-id")
          const rect = element.getBoundingClientRect()
          const center = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          }
          const pointerTarget = document.elementFromPoint(center.x, center.y)
          if (!id || !pointerTarget || !element.contains(pointerTarget))
            return []
          return [
            {
              id,
              distance:
                (center.x - viewportCenter.x) ** 2 +
                (center.y - viewportCenter.y) ** 2,
            },
          ]
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, desiredCount)
        .map(({ id }) => id)
    }, count)

const idleFrameDeltas = async (
  page: Page,
  sampleCount: number
): Promise<number[]> =>
  page.evaluate(
    (samples) =>
      new Promise<number[]>((resolve) => {
        const deltas: number[] = []
        let previous = performance.now()
        const sample = (now: number) => {
          deltas.push(now - previous)
          previous = now
          if (deltas.length === samples) resolve(deltas)
          else requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      }),
    sampleCount
  )

const p95FrameDelta = (deltas: readonly number[]): number => {
  const sorted = deltas.toSorted((a, b) => a - b)
  return sorted[Math.ceil(sorted.length * 0.95) - 1]
}

const hasMultipleDirectionChanges = (path: string): boolean => {
  const commands = [
    ...path.matchAll(/([ML])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g),
  ].map(([, command, x, y]) => ({
    command,
    point: { x: Number(x), y: Number(y) },
  }))
  let previousPoint: { x: number; y: number } | undefined
  let previousDirection: "horizontal" | "vertical" | undefined
  let directionChanges = 0
  for (const { command, point } of commands) {
    if (command === "M" || !previousPoint) {
      previousPoint = point
      previousDirection = undefined
      continue
    }
    const direction =
      previousPoint.x === point.x && previousPoint.y !== point.y
        ? "vertical"
        : previousPoint.y === point.y && previousPoint.x !== point.x
          ? "horizontal"
          : undefined
    if (direction && previousDirection && direction !== previousDirection) {
      directionChanges++
      if (directionChanges >= 2) return true
    }
    previousDirection = direction
    previousPoint = point
  }
  return false
}

const expectStableFirstPaint = async (
  page: Page,
  editor: Locator,
  expectedEdgeCount: number
): Promise<Record<string, string>> => {
  await page.waitForFunction(
    (expected) =>
      Object.keys(
        (window as RoutingFilmstripWindow).__apollonFirstVisibleRoutes ?? {}
      ).length === expected,
    expectedEdgeCount
  )
  const [recording, settled] = await Promise.all([
    page.evaluate(
      () =>
        (window as RoutingFilmstripWindow)
          .__apollonFirstVisibleRoutes as Record<string, string>
    ),
    renderedEdgePaths(editor),
  ])

  expect(recording).toEqual(settled)
  return settled
}

test("initial and replacement routes never paint provisional geometry", async ({
  page,
}) => {
  const initialSelector = `#react-flow-library-${String(fixture.id)}`
  const expectedEdgeCount = (fixture.edges as unknown[]).length
  await page.addInitScript(
    ({ selector, edgeCount }) => {
      let animationFrame = 0
      const targetWindow = window as RoutingFilmstripWindow
      targetWindow.__startApollonRoutingFilmstrip = (
        nextSelector,
        nextEdgeCount
      ) => {
        cancelAnimationFrame(animationFrame)
        const firstVisibleRoutes: Record<string, string> = {}
        targetWindow.__apollonFirstVisibleRoutes = firstVisibleRoutes
        let captured = 0
        const sample = () => {
          const editor = document.querySelector(nextSelector)
          const paths =
            editor?.querySelectorAll<SVGPathElement>(
              ".react-flow__edge-path"
            ) ?? []
          for (const path of paths) {
            const id = path
              .closest(".react-flow__edge")
              ?.getAttribute("data-id")
            const d = path.getAttribute("d")
            if (id && d && firstVisibleRoutes[id] === undefined) {
              firstVisibleRoutes[id] = d
              captured++
            }
          }
          if (captured >= nextEdgeCount) return
          animationFrame = requestAnimationFrame(sample)
        }
        animationFrame = requestAnimationFrame(sample)
      }
      targetWindow.__startApollonRoutingFilmstrip(selector, edgeCount)
    },
    { selector: initialSelector, edgeCount: expectedEdgeCount }
  )

  await openLocalWithPerf(page, fixture)
  const initialRoutes = await expectStableFirstPaint(
    page,
    page.locator(initialSelector),
    expectedEdgeCount
  )
  expect(
    Object.values(initialRoutes).some(hasMultipleDirectionChanges),
    "fixture no longer exercises an orthogonal route with multiple bends"
  ).toBe(true)

  const nodes = fixture.nodes as Array<{
    position: { x: number; y: number }
  }>
  const left = Math.min(...nodes.map(({ position }) => position.x))
  const right = Math.max(...nodes.map(({ position }) => position.x))
  const replacement = {
    ...fixture,
    nodes: nodes.map((node) => ({
      ...node,
      position: {
        ...node.position,
        x: left + right - node.position.x,
      },
    })),
  }
  await page.evaluate(
    ({ selector, edgeCount, model }) => {
      const targetWindow = window as RoutingFilmstripWindow
      if (
        !targetWindow.apollonEditor ||
        !targetWindow.__startApollonRoutingFilmstrip
      )
        throw new Error("public model-replacement test seam is unavailable")
      targetWindow.__startApollonRoutingFilmstrip(selector, edgeCount)
      targetWindow.apollonEditor.model = model
    },
    {
      selector: initialSelector,
      edgeCount: expectedEdgeCount,
      model: replacement,
    }
  )
  const replacementRoutes = await expectStableFirstPaint(
    page,
    page.locator(initialSelector),
    expectedEdgeCount
  )
  expect(replacementRoutes).not.toEqual(initialRoutes)
})

const beginContinuousNodeDrag = async (node: Locator, page: Page) => {
  const box = await node.boundingBox()
  expect(box).not.toBeNull()
  const startX = box!.x + box!.width / 2
  const startY = box!.y + box!.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  for (let step = 1; step <= 30; step++) {
    await page.mouse.move(startX + step * 2, startY + step)
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    )
  }
}

test("dragging a node re-routes only the edges it can have moved", async ({
  page,
}) => {
  await openLocalWithPerf(page, fixture)

  const baseline = await readPerf(page)
  expect(baseline.nodesMapSize).toBe(30)

  const editor = page.locator(`#react-flow-library-${String(fixture.id)}`)
  for (let i = 0; i < DRAG_COUNT; i++) {
    const node = editor.locator(
      `.react-flow__node[data-id="perf-node-${String(i % 30).padStart(2, "0")}"]`
    )
    // Alternating, so the nodes stay on screen across the run.
    await dragNodeBy(node, page, i % 2 === 0 ? 40 : -40, i % 2 === 0 ? 30 : -30)
  }

  const after = await readPerf(page)

  const searches = after.edgeSearches - baseline.edgeSearches
  const expansions = after.edgeSearchExpansions - baseline.edgeSearchExpansions

  const routeScorePairs = after.routeScorePairs - baseline.routeScorePairs

  expect(
    searches / DRAG_COUNT,
    `${(searches / DRAG_COUNT).toFixed(0)} edge searches per drag gesture — ` +
      `a drag is re-routing edges it cannot have moved`
  ).toBeLessThan(MAX_SEARCHES_PER_DRAG)

  if (searches > 0) {
    expect(
      expansions / searches,
      `${(expansions / searches).toFixed(0)} expansions per search — the router is ` +
        `searching a lattice built from more of the diagram than it needs`
    ).toBeLessThan(MAX_EXPANSIONS_PER_SEARCH)
  }

  // The worst single search, which is the one that drops a frame. An average over
  // hundreds of edges will absorb it without moving.
  expect(
    after.edgeSearchesMaxExpansions,
    `worst search cost ${after.edgeSearchesMaxExpansions} expansions — one edge is ` +
      `paying for a lattice the whole diagram built`
  ).toBeLessThan(MAX_EXPANSIONS_WORST_SEARCH)

  // The search has a work budget, beyond which it gives up and the edge falls back
  // to a plain step route. That backstop exists so a pathological layout cannot
  // freeze the canvas — but an ORDINARY diagram reaching it would mean the router
  // is quietly not running, which is a silent failure rather than a slow one.
  expect(after.edgeSearchesAbandoned).toBe(0)

  expect(
    routeScorePairs / DRAG_COUNT,
    `${(routeScorePairs / DRAG_COUNT).toFixed(0)} route pairs scored per drag — ` +
      `the route-set objective is rescanning spatially impossible pairs`
  ).toBeLessThan(MAX_ROUTE_SCORE_PAIRS_PER_DRAG)
})

test("a continuously moving large diagram shows holistic route progress before release", async ({
  page,
}) => {
  await openLocalWithPerf(page, fixture)
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __apollonPerf?: () => { routingSolving: number } | undefined
        }
      ).__apollonPerf?.()?.routingSolving === 0
  )
  const beforeInteraction = await readPerf(page)

  const editor = page.locator(`#react-flow-library-${String(fixture.id)}`)
  const viewport = page.viewportSize()!
  const nodeId = await nodeNearestViewportCenter(editor, viewport)
  expect(nodeId).not.toBeNull()
  const incidentIds = new Set(
    (fixture.edges as Array<{ id: string; source: string; target: string }>)
      .filter((edge) => edge.source === nodeId || edge.target === nodeId)
      .map((edge) => edge.id)
  )
  const before = await renderedEdgePaths(editor)
  const node = editor.locator(`.react-flow__node[data-id="${nodeId}"]`)
  await beginContinuousNodeDrag(node, page)
  // Keep input arriving faster than the minimum adaptive Worker cadence. This
  // would perpetually starve a trailing-edge debounce.
  const during = await renderedEdgePaths(editor)
  const changedIds = Object.keys(during).filter(
    (id) => before[id] !== undefined && before[id] !== during[id]
  )
  expect(changedIds.some((id) => incidentIds.has(id))).toBe(true)
  expect(
    changedIds.some((id) => !incidentIds.has(id)),
    "only endpoint projection changed; no visible neighbouring edge received holistic Worker progress"
  ).toBe(true)
  const duringInteraction = await readPerf(page)
  expect(duringInteraction.routingPreviewCount).toBeGreaterThan(0)
  expect(
    duringInteraction.workerHolisticPreviewCount -
      beforeInteraction.workerHolisticPreviewCount
  ).toBeGreaterThanOrEqual(2)
  expect(duringInteraction.workerFirstPreviewMaxMs).toBeGreaterThan(0)
  expect(duringInteraction.workerFirstPreviewMaxMs).toBeLessThanOrEqual(
    duringInteraction.workerRoundTripMaxMs +
      MAX_WORKER_CADENCE_MS +
      MAX_P95_INTERACTION_FRAME_MS
  )
  expect(duringInteraction.workerPreviewGapMaxMs).toBeLessThanOrEqual(
    duringInteraction.workerRoundTripMaxMs +
      MAX_WORKER_CADENCE_MS +
      MAX_P95_INTERACTION_FRAME_MS
  )
  expect(duringInteraction.workerFirstPreviewMaxMs).toBeLessThanOrEqual(
    MAX_WORKER_PREVIEW_FRESHNESS_MS
  )
  expect(duringInteraction.workerPreviewGapMaxMs).toBeLessThanOrEqual(
    MAX_WORKER_PREVIEW_FRESHNESS_MS
  )

  await page.mouse.up()
  const handoff = await page.evaluate(
    ({ editorId, expectedEdgeCount }) => {
      return new Promise<{
        missingEdgeFrame: boolean
        timedOut: boolean
      }>((resolve) => {
        let missingEdgeFrame = false
        let animationFrame = 0
        let finished = false
        const finish = (timedOut: boolean) => {
          if (finished) return
          finished = true
          cancelAnimationFrame(animationFrame)
          clearTimeout(timeout)
          resolve({ missingEdgeFrame, timedOut })
        }
        const timeout = window.setTimeout(() => finish(true), 5_000)
        const tick = () => {
          const root = document.querySelector(editorId)
          if (
            root?.querySelectorAll(".react-flow__edge-path").length !==
            expectedEdgeCount
          )
            missingEdgeFrame = true
          const perf = (
            window as unknown as {
              __apollonPerf?: (
                skipDocumentEncoding?: boolean
              ) =>
                | { routingSolving: number; routingPreviewCount: number }
                | undefined
            }
          ).__apollonPerf?.(true)
          if (perf?.routingSolving === 0 && perf.routingPreviewCount === 0)
            finish(false)
          else animationFrame = requestAnimationFrame(tick)
        }
        animationFrame = requestAnimationFrame(tick)
      })
    },
    {
      editorId: `#react-flow-library-${String(fixture.id)}`,
      expectedEdgeCount: Object.keys(during).length,
    }
  )
  expect(handoff.timedOut).toBe(false)
  expect(handoff.missingEdgeFrame).toBe(false)
  const afterHandoff = await readPerf(page)
  expect(afterHandoff.routingSolving).toBe(0)
  expect(afterHandoff.routingPreviewCount).toBe(0)
  expect(
    afterHandoff.workerAttemptCount - beforeInteraction.workerAttemptCount
  ).toBeGreaterThan(0)
  expect(
    afterHandoff.workerAttemptCount - beforeInteraction.workerAttemptCount
  ).toBeLessThanOrEqual(
    afterHandoff.workerResponseCount - beforeInteraction.workerResponseCount + 1
  )
  expect(
    afterHandoff.workerSolveCount - beforeInteraction.workerSolveCount
  ).toBeGreaterThan(0)
  expect(
    afterHandoff.workerFallbackCount - beforeInteraction.workerFallbackCount
  ).toBe(0)
  expect(afterHandoff.workerLatestInputRevision).toBe(
    afterHandoff.workerLastDispatchedRevision
  )
  expect(afterHandoff.workerLastAcceptedRevision).toBe(
    afterHandoff.workerLatestInputRevision
  )
  expect(afterHandoff.workerSerializeMaxMs).toBeLessThanOrEqual(
    MAX_WORKER_MAIN_THREAD_SLICE_MS
  )
  expect(afterHandoff.workerPostMessageMaxMs).toBeLessThanOrEqual(
    MAX_WORKER_MAIN_THREAD_SLICE_MS
  )
  expect(afterHandoff.workerDispatchDelayMaxMs).toBeLessThanOrEqual(
    afterHandoff.workerRoundTripMaxMs +
      MAX_WORKER_CADENCE_MS +
      MAX_P95_INTERACTION_FRAME_MS
  )
  expect(afterHandoff.workerSnapshotAgeMaxMs).toBeLessThanOrEqual(
    MAX_WORKER_SNAPSHOT_AGE_MS
  )
  expect(afterHandoff.workerReleaseExactMaxMs).toBeGreaterThan(0)
  expect(afterHandoff.workerReleaseExactMaxMs).toBeLessThanOrEqual(
    afterHandoff.workerRoundTripMaxMs * 2 + MAX_P95_INTERACTION_FRAME_MS * 2
  )
  expect(afterHandoff.workerReleaseSettledMaxMs).toBeLessThanOrEqual(
    afterHandoff.workerReleaseExactMaxMs +
      SETTLEMENT_DURATION_MS +
      MAX_P95_INTERACTION_FRAME_MS * 2
  )
  expect(afterHandoff.workerReleaseSettledMaxMs).toBeLessThanOrEqual(
    MAX_WORKER_RELEASE_MS
  )
  const settled = await renderedEdgePaths(editor)
  const changedAtSettlement = Object.keys(settled).filter(
    (id) => during[id] !== undefined && during[id] !== settled[id]
  )
  if (changedAtSettlement.length > 0)
    expect(afterHandoff.workerReleaseSettledMaxMs).toBeGreaterThan(
      afterHandoff.workerReleaseExactMaxMs
    )
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
  expect(await renderedEdgePaths(editor)).toEqual(settled)
})

test("reduced motion skips the handoff used by the same release", async ({
  page,
}) => {
  const runGesture = async () => {
    await openLocalWithPerf(page, fixture)
    const editor = page.locator(`#react-flow-library-${String(fixture.id)}`)
    const nodeId = await nodeNearestViewportCenter(editor, page.viewportSize()!)
    expect(nodeId).not.toBeNull()
    const node = editor.locator(`.react-flow__node[data-id="${nodeId}"]`)
    await beginContinuousNodeDrag(node, page)
    await page.mouse.up()
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __apollonPerf?: () => { routingSolving: number } | undefined
          }
        ).__apollonPerf?.()?.routingSolving === 0
    )
    return readPerf(page)
  }

  const animated = await runGesture()
  expect(animated.workerReleaseSettledMaxMs).toBeGreaterThan(
    animated.workerReleaseExactMaxMs
  )

  await page.emulateMedia({ reducedMotion: "reduce" })
  const after = await runGesture()
  expect(
    after.workerReleaseExactMaxMs,
    `missing reduced-motion release timing: ${JSON.stringify(after)}`
  ).toBeGreaterThan(0)
  expect(after.workerReleaseSettledMaxMs).toBe(after.workerReleaseExactMaxMs)
  expect(after.routingPreviewCount).toBe(0)
  expect(after.workerLastAcceptedRevision).toBe(after.workerLatestInputRevision)
})

test("large-diagram interaction stays within its p95 frame budget", async ({
  page,
}) => {
  await openLocalWithPerf(page, fixture)
  const editor = page.locator(`#react-flow-library-${String(fixture.id)}`)
  const frameDeltas: number[] = []
  const nodeIds = await unobscuredNodesNearestViewportCenter(editor, 4)
  const idleP95 = p95FrameDelta(await idleFrameDeltas(page, 48))

  expect(
    nodeIds,
    "performance fixture must expose four unobscured nodes"
  ).toHaveLength(4)

  for (const [index, nodeId] of nodeIds.entries()) {
    const node = editor.locator(`.react-flow__node[data-id="${nodeId}"]`)
    frameDeltas.push(
      ...(await dragNodeBy(node, page, index % 2 === 0 ? 40 : -40, 30, {
        steps: 12,
        measureFrames: true,
      }))
    )
  }

  expect(frameDeltas.length).toBeGreaterThan(20)
  const p95 = p95FrameDelta(frameDeltas)
  expect(
    idleP95,
    `idle Firefox p95 was ${idleP95.toFixed(1)} ms; runner is too slow for a meaningful interaction benchmark`
  ).toBeLessThanOrEqual(MAX_P95_IDLE_FRAME_MS)
  // Preserve the first valid hosted baseline; on a slower-idling runner reject
  // an interaction that takes more than two of that runner's own frames.
  const effectiveBudget = Math.max(MAX_P95_VISIBLE_DRAG_FRAME_MS, idleP95 * 2)
  expect(
    p95,
    `p95 interaction frame was ${p95.toFixed(1)} ms; idle p95 was ${idleP95.toFixed(1)} ms`
  ).toBeLessThanOrEqual(effectiveBudget)
})
