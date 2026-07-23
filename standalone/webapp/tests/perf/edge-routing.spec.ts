import { test, expect, type Locator } from "@playwright/test"
import {
  loadFixture,
  openLocalWithPerf,
  readPerf,
  dragNodeBy,
} from "./perfHelpers"

/**
 * Edge routing is a graph search. Large subsequent solves run in a Worker, but
 * wasting searches still delays the exact accepted generation and burns CPU that
 * the browser needs for rendering. An edge's route depends on its endpoints, the
 * few nodes near it and the edges it must not cross; when none of those changed,
 * the answer did not either, and the edge must not search again.
 *
 * That is the property this spec holds onto, and it is not one a stopwatch can
 * hold. A wall-clock budget measures the machine — it passes on a developer laptop
 * and fails on a loaded CI box, so it either flakes or gets loosened until it
 * means nothing. Counting searches measures the ALGORITHM: "dragging one node
 * re-routes the whole canvas, sixty times a second" fails here identically
 * everywhere, which is exactly the regression that made the editor lag.
 *
 * 30 classes, 87 edges — a third of them running past a node that is squarely in
 * the way, so they genuinely search.
 */
test.describe.configure({ mode: "serial" })

const fixture = loadFixture("perf-routing-30-nodes.json")
const DRAG_COUNT = 10

/**
 * Searches a single drag gesture may cost.
 *
 * A drag is ~12 frames. Moving one node changes the world for the edges attached
 * to it, the ones a moved obstacle now sits in front of, and — as those re-route —
 * their close neighbours in turn. Re-routing all 87 edges every frame (the
 * behaviour before routes were keyed on their inputs) is ~1000 searches per
 * gesture; this budget stays well below that, so a genuine "re-route the whole
 * canvas" regression still fails here loudly.
 *
 * The number is a headroom over the real per-gesture cost, not a tight fit to it.
 * Auto endpoint anchors (edges slide/switch sides to route cleanly) raise that
 * cost on purpose: more edges attach at varied points and fan out into separate
 * lanes, so a moving node ripples through more neighbours. That cost is
 * irreducible under deterministic exactness — a route MUST be a pure function of
 * the current geometry (so Yjs peers with different drag histories never diverge).
 * Proven cached routes and incumbent bounds may make a warm solve faster, but may
 * never change its answer. Route keys include only the clipped obstacle/edge
 * corridor the search can reach. What remains is legitimate work; the budget
 * leaves room for browser event-coalescing differences without approaching the
 * ~1000-search regression.
 */
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
  const nodeId = await editor
    .locator(".react-flow__node")
    .evaluateAll((elements, size) => {
      let nearest: string | null = null
      let distance = Infinity
      for (const element of elements) {
        const rect = element.getBoundingClientRect()
        const next = Math.hypot(
          rect.x + rect.width / 2 - size.width / 2,
          rect.y + rect.height / 2 - size.height / 2
        )
        if (next < distance) {
          distance = next
          nearest = element.getAttribute("data-id")
        }
      }
      return nearest
    }, viewport)
  expect(nodeId).not.toBeNull()
  const incidentIds = new Set(
    (fixture.edges as Array<{ id: string; source: string; target: string }>)
      .filter((edge) => edge.source === nodeId || edge.target === nodeId)
      .map((edge) => edge.id)
  )
  const before = await renderedEdgePaths(editor)
  const node = editor.locator(`.react-flow__node[data-id="${nodeId}"]`)
  const box = await node.boundingBox()
  expect(box).not.toBeNull()
  const startX = box!.x + box!.width / 2
  const startY = box!.y + box!.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  // Keep input arriving faster than the 80 ms Worker preview cadence. This
  // would perpetually starve the former trailing-edge debounce.
  for (let step = 1; step <= 30; step++) {
    await page.mouse.move(startX + step * 2, startY + step)
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    )
  }

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
    duringInteraction.previewDecisionHoldCount -
      beforeInteraction.previewDecisionHoldCount,
    "the dense pressure gesture did not exercise provisional side/port/route hysteresis"
  ).toBeGreaterThan(0)

  await page.mouse.up()
  const handoffFrames = await page.evaluate(
    async ({ editorId }) => {
      const readPaths = () => {
        const root = document.querySelector(editorId)
        if (!root) return {}
        return Object.fromEntries(
          [...root.querySelectorAll(".react-flow__edge")].flatMap((element) => {
            const id = element.getAttribute("data-id")
            const d = element
              .querySelector(".react-flow__edge-path")
              ?.getAttribute("d")
            return id && d ? [[id, d]] : []
          })
        )
      }
      const frames: Array<Record<string, string>> = []
      for (let frame = 0; frame < 240; frame++) {
        frames.push(readPaths())
        const perf = (
          window as unknown as {
            __apollonPerf?: () =>
              | { routingSolving: number; routingPreviewCount: number }
              | undefined
          }
        ).__apollonPerf?.()
        if (perf?.routingSolving === 0 && perf.routingPreviewCount === 0) break
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve())
        )
      }
      return frames
    },
    { editorId: `#react-flow-library-${String(fixture.id)}` }
  )
  const afterHandoff = await readPerf(page)
  expect(afterHandoff.routingSolving).toBe(0)
  expect(afterHandoff.routingPreviewCount).toBe(0)
  const settled = await renderedEdgePaths(editor)
  const changedAtSettlement = Object.keys(settled).filter(
    (id) => during[id] !== undefined && during[id] !== settled[id]
  )
  expect(
    changedAtSettlement.length,
    "the pressure gesture did not exercise a preview-to-settled route change"
  ).toBeGreaterThan(0)
  expect(
    changedAtSettlement.some((id) =>
      handoffFrames.some(
        (frame) =>
          frame[id] !== undefined &&
          frame[id] !== during[id] &&
          frame[id] !== settled[id]
      )
    ),
    "the final exact route snapped directly from preview instead of traversing an intermediate orthogonal frame"
  ).toBe(true)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
  expect(await renderedEdgePaths(editor)).toEqual(settled)
})
