import { describe, it, expect } from "vitest"
import { Position, type Node } from "@xyflow/react"
import { routeOrthogonalPath } from "@/utils/edgeUtils"
import { getEdgeObstacles } from "@/utils/geometry/obstacles"
import { getPerfCounters } from "@/sync/perfCounters"
import type { IPoint } from "@/edges/Connection"

/**
 * The router runs on the render path: every edge re-routes while a node is
 * dragged, so its cost is paid per edge, per frame. A search that is merely "fast
 * enough" on two nodes is not fast enough on a real diagram — and a router nobody
 * can afford to run gets bypassed, which is how edges end up drawn through the
 * nodes it was written to avoid.
 *
 * Budgeted in WORK (searches, expansions), never in milliseconds. A stopwatch
 * measures the machine: it passes on a laptop, fails on a loaded CI box, and gets
 * loosened until it means nothing. Expansions measure the algorithm and fail
 * identically everywhere.
 *
 * The routing is EDGE-AWARE here, which is the whole point of the fixture. Routing
 * this diagram without neighbour edges costs ~180 expansions a search; with them it
 * costs an order of magnitude more, because every neighbour segment mints turning
 * lines and the lattice is quadratic in those. A budget measured on the cheap path
 * would have several times more headroom than it knows, and would not notice a
 * regression in the term that dominates. So the benchmark routes the diagram the
 * way the editor does: twice, the second pass seeing the first pass's routes.
 */
const COLUMNS = 6
const ROWS = 5
const NODE_WIDTH = 160
const NODE_HEIGHT = 100
/** Deliberately tight: the nodes sit 40px apart, so no edge gets its full 25px of
 * clearance and every one of them is handed to the search. The worst case, not the
 * average one. */
const GAP = 40

const buildDiagram = (): { nodes: Node[]; edges: [string, string][] } => {
  const nodes: Node[] = []
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      nodes.push({
        id: `n${row}-${column}`,
        type: "class",
        position: {
          x: column * (NODE_WIDTH + GAP),
          y: row * (NODE_HEIGHT + GAP),
        },
        data: {},
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      })
    }
  }

  const edges: [string, string][] = []
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      // Neighbours: the easy case, and the common one.
      if (column + 1 < COLUMNS)
        edges.push([`n${row}-${column}`, `n${row}-${column + 1}`])
      if (row + 1 < ROWS)
        edges.push([`n${row}-${column}`, `n${row + 1}-${column}`])
      // Two apart: a node sits squarely in the way, so these are the edges that
      // genuinely have to search. Every real diagram has them.
      if (column + 2 < COLUMNS)
        edges.push([`n${row}-${column}`, `n${row}-${column + 2}`])
      if (row + 2 < ROWS)
        edges.push([`n${row}-${column}`, `n${row + 2}-${column}`])
    }
  }
  return { nodes, edges }
}

describe("router performance", () => {
  it("routes a whole edge-aware class diagram inside its work budget", () => {
    const { nodes, edges } = buildDiagram()
    const byId = new Map(nodes.map((node) => [node.id, node]))
    const routes = new Map<number, IPoint[]>()

    const routeAll = (edgeAware: boolean) => {
      edges.forEach(([sourceId, targetId], index) => {
        const source = byId.get(sourceId)!
        const target = byId.get(targetId)!
        const horizontal = source.position.y === target.position.y
        const sourcePoint = horizontal
          ? {
              x: source.position.x + NODE_WIDTH,
              y: source.position.y + NODE_HEIGHT / 2,
            }
          : {
              x: source.position.x + NODE_WIDTH / 2,
              y: source.position.y + NODE_HEIGHT,
            }
        const targetPoint = horizontal
          ? { x: target.position.x, y: target.position.y + NODE_HEIGHT / 2 }
          : { x: target.position.x + NODE_WIDTH / 2, y: target.position.y }

        // Neighbours as the editor gathers them (`useEdgeRoutingContext`): the
        // routes passing within a box around THIS edge's endpoints, and only those
        // earlier in the ordering, so routing never depends on its own output.
        // Handing the router every edge on the canvas instead would measure a
        // lattice the app never builds — the same mistake as measuring it with no
        // neighbours at all, in the other direction.
        const pad = 6 * 30
        const minX = Math.min(sourcePoint.x, targetPoint.x) - pad
        const maxX = Math.max(sourcePoint.x, targetPoint.x) + pad
        const minY = Math.min(sourcePoint.y, targetPoint.y) - pad
        const maxY = Math.max(sourcePoint.y, targetPoint.y) + pad
        const neighbors = edgeAware
          ? [...routes.entries()]
              .filter(
                ([i, route]) =>
                  i < index &&
                  route.some(
                    (p) =>
                      p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY
                  )
              )
              .map(([, route]) => route)
          : []

        routes.set(
          index,
          routeOrthogonalPath(
            sourcePoint,
            targetPoint,
            horizontal ? Position.Right : Position.Bottom,
            horizontal ? Position.Left : Position.Top,
            getEdgeObstacles(
              nodes,
              sourceId,
              targetId,
              sourcePoint,
              targetPoint
            ),
            neighbors
          )
        )
      })
    }

    // First pass seeds the geometry the second pass is aware of — exactly how the
    // editor's first and subsequent renders relate.
    routeAll(false)

    const counters = getPerfCounters()!
    const before = { ...counters }
    routeAll(true)

    const searches = counters.routerSearches - before.routerSearches
    const expansions = counters.routerExpansions - before.routerExpansions
    const abandoned = counters.routerAbandoned - before.routerAbandoned

    expect(routes.size).toBe(edges.length)
    expect(searches).toBeGreaterThan(0)

    // Expansions are the search's real cost, and they grow with the square of the
    // lattice — so this catches a change that hands the router more of the diagram
    // than it needs (every node instead of the nearby ones) or mints more lanes than
    // any route can turn on.
    //
    // Every state is expanded at most once (the heuristic is consistent, so a closed
    // state is settled), which bounds a search by its own lattice. These budgets are
    // deliberately close to the measured cost — 912 expansions a search, worst edge
    // 6_866 — because the count is deterministic: there is no machine variance to
    // leave headroom for, and headroom is only room for a regression to hide in.
    expect(expansions / searches).toBeLessThan(1_500)

    // And the WORST search, not just the average one. A frame is dropped by the one
    // edge that costs ten times the rest, and a mean over seventy-eight of them will
    // swallow it without a murmur.
    expect(counters.routerMaxExpansions).toBeLessThan(10_000)

    // Nothing hit the safety budget. That budget exists so a pathological layout
    // degrades to a plain step route instead of freezing the canvas — an ORDINARY
    // diagram reaching it would mean the router is quietly not running, which is a
    // silent failure rather than a slow one.
    expect(abandoned).toBe(0)
  })
})
