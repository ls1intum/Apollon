import { test, expect } from "@playwright/test"
import {
  loadFixture,
  openLocalWithPerf,
  readPerf,
  dragNodeBy,
} from "./perfHelpers"

/**
 * Edge routing is a graph search, and it runs on the render path: React re-renders
 * every edge on every frame of a node drag. What makes that affordable is not how
 * fast one search is — it is how RARELY one is needed. An edge's route depends on
 * its endpoints, the few nodes near it and the edges it must not cross; when none
 * of those changed, the answer did not either, and the edge must not search again.
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
 * A drag is ~12 frames. Moving one node changes the world for the handful of edges
 * attached to it and the few that pass close by — call it a dozen edges, each
 * re-searching as the node moves. Re-routing all 87 edges per frame (the
 * behaviour before routes were keyed on their inputs) is ~1000 searches per
 * gesture; this budget sits an order of magnitude below that and comfortably above
 * what the real work costs.
 */
const MAX_SEARCHES_PER_DRAG = 250

/** The search's own cost. Ordinary detours run a few hundred expansions; a lattice
 * built from the whole diagram instead of the nodes near the edge runs orders of
 * magnitude more. */
const MAX_EXPANSIONS_PER_SEARCH = 3_000

/** And what the single most expensive edge may cost. Every state is expanded at
 * most once, so a search is bounded by its own lattice — an edge far above this is
 * one whose lattice was built from more geometry than it can turn on. */
const MAX_EXPANSIONS_WORST_SEARCH = 12_000

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
})
