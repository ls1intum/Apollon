import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"
import {
  findEdgeNodeOverlaps,
  clearanceToConnectedNode,
  readNodeRects,
  sampleEdgePath,
  distanceToRectBorder,
  type Pt,
} from "../helpers/edgeGeometry"

/**
 * Real diagrams, used as a routing oracle.
 *
 * Each of these is an actual model exported from the editor while its routes
 * looked wrong. Rather than assert on one hand-picked edge, every edge in every
 * diagram is held to four rules — the four ways a route that is technically legal
 * still reads as broken:
 *
 *  1. It never runs through a node body, including the bodies it connects.
 *  2. It is not drawn ALONG a container's frame. (It must CROSS out of its own
 *     package; crossing is perpendicular and brief. Lying on the frame is not.)
 *  3. Past its own stub, it keeps a real margin off its endpoint nodes. This is
 *     the border-hugging catch: a route threading a seam along a node's edge
 *     satisfies rule 1 — it is not strictly *inside* the node — and still looks
 *     completely broken.
 *  4. No two edges are drawn on top of one another.
 *
 * One test per diagram, not one per rule per edge: the fixtures are the units, the
 * rules are what "correct" means for all of them, and booting the editor sixty-nine
 * times to assert on one edge each buys nothing but wall clock.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
type Model = {
  id: string
  nodes: { id: string; parentId?: string }[]
  edges: { id: string; source: string; target: string }[]
}

const load = (file: string) =>
  JSON.parse(
    fs.readFileSync(path.join(__d, "..", "fixtures", file), "utf-8")
  ) as Model

/**
 * Containers an edge legitimately lives inside: every ancestor of either endpoint.
 * An edge from a class inside a package must cross that package to leave it — that
 * is correct routing, not an overlap, and the router excludes these from its
 * obstacle set for exactly this reason. The oracle has to make the same exclusion
 * or it fails the router for doing the right thing.
 */
const ancestorsOfEndpoints = (model: Model, edge: Model["edges"][number]) => {
  const byId = new Map(model.nodes.map((n) => [n.id, n]))
  const ancestors = new Set<string>()
  for (const start of [edge.source, edge.target]) {
    let current = byId.get(start)?.parentId
    while (current && !ancestors.has(current)) {
      ancestors.add(current)
      current = byId.get(current)?.parentId
    }
  }
  return ancestors
}

/**
 * The margin an edge keeps off its own endpoint node is 25px when there is room
 * for it — but it is a PRICE, not a wall. Two nodes can sit closer together than
 * twice that margin, and then one of them has to give. What must never happen is
 * the edge grazing the node, so this is the floor it may never go below: two grid
 * cells, both visibly clear of the border and wide enough for a line-jump arc.
 * Asserting the full 25px would be asserting a guarantee the router deliberately
 * does not make, and the only way to honour it would be the thousand-pixel detour
 * this whole design exists to avoid.
 */
const MIN_ENDPOINT_MARGIN = 10

/** The gap between two node boxes: 0 when they touch, negative when they overlap. */
const separation = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): number => {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width))
  const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height))
  return Math.max(dx, dy, 0)
}

/**
 * How far two edges run drawn on top of each other.
 *
 * Not "do they touch". Two edges crossing touch at a point, and a crossing is
 * ordinary UML the renderer draws a jump arc over. What is never acceptable is a
 * shared RUN — two associations rendered as one line, which reads as a missing
 * edge — so this measures the length over which the paths stay within a hair of
 * each other. A crossing coincides at a single sample and cannot produce one.
 */
const OVERLAP_SAMPLE_PX = 4
const OVERLAP_TOLERANCE_PX = 2
const overlapRunPx = (a: Pt[], b: Pt[]): number => {
  let longest = 0
  let current = 0
  for (const p of a) {
    const touches = b.some(
      (q) =>
        Math.abs(p.x - q.x) <= OVERLAP_TOLERANCE_PX &&
        Math.abs(p.y - q.y) <= OVERLAP_TOLERANCE_PX
    )
    current = touches ? current + OVERLAP_SAMPLE_PX : 0
    if (current > longest) longest = current
  }
  return longest
}

/** Edges leaving the same handle share a bus for a stub's length before they fan
 * out, which is correct. Anything past that is a shared run, and a defect. */
const MAX_SHARED_RUN_PX = 40

const DIAGRAMS = [
  "edge-margin-around-a.json",
  "edge-margin-5.json",
  // Each of these pins a distinct defect found in a real model:
  "edge-diag-6.json", // an edge drawn along a package's frame
  "edge-diag-7.json", // a crossing too close to a bend for its jump to draw
  "edge-diag-8.json", // margins sealing a 45px gap → a thousand-pixel detour
  "edge-diag-9.json", // an avoidable crossing, taken anyway
  "edge-diag-13.json", // an edge hugging one wall of a 20px gap instead of centring
  "edge-diag-14.json", // a lap of the diagram to avoid a 15px band it had to use
  "edge-diag-15.json", // an avoidable crossing between two edges
  "edge-diag-16.json", // an edge drawn along the border two touching nodes share
  "edge-diag-17.json", // two edges drawn on top of one another
  "edge-diag-18.json", // a detour around a whole class to dodge one clean crossing
]

/**
 * The other half of the margin contract. The floor above says the edge never
 * grazes a node; this says it does not settle for the floor when it could have had
 * the whole margin. Without it, "soft" could quietly decay into "always hugs" and
 * every test below would still pass.
 *
 * diagram 4's class A has open space around it, so an edge wrapping it has no
 * excuse: it must stand off the full margin.
 */
test("an edge with room takes the full margin, not just the floor", async ({
  page,
}) => {
  const roomy = load("edge-margin-around-a.json")
  await openFixtureInLocalEditor(
    page,
    roomy as unknown as Record<string, unknown>
  )
  await waitForCanvasReady(page)

  const A = "8a485c82-84c0-4634-8b3c-0ba94ad5aa42"
  // The edge that wraps around A's far side to reach its right border.
  const wrapping = "c984d52d-6b12-4fd5-9c58-5f441f98be30"
  const margin = await clearanceToConnectedNode(page, wrapping, A, "target")
  expect(
    margin,
    `edge settled for ${margin.toFixed(1)}px when it had room for the full margin`
  ).toBeGreaterThanOrEqual(20)
})

for (const file of DIAGRAMS) {
  const model = load(file)

  test(`every edge in ${file} is routed cleanly`, async ({ page }) => {
    await openFixtureInLocalEditor(
      page,
      model as unknown as Record<string, unknown>
    )
    await waitForCanvasReady(page)

    const rects = await readNodeRects(page)
    const paths = new Map<string, Pt[]>()
    for (const edge of model.edges) {
      paths.set(edge.id, await sampleEdgePath(page, edge.id, OVERLAP_SAMPLE_PX))
    }

    for (const edge of model.edges) {
      const short = edge.id.slice(0, 8)
      const containers = ancestorsOfEndpoints(model, edge)

      // 1. Never through a node body.
      const overlaps = (
        await findEdgeNodeOverlaps(page, edge.id, {
          source: edge.source,
          target: edge.target,
        })
      ).filter((o) => !containers.has(o.nodeId))
      expect(
        overlaps,
        `edge ${short} cut into: ${overlaps
          .map((o) => `${o.nodeId.slice(0, 8)} by ${o.depthPx.toFixed(1)}px`)
          .join(", ")}`
      ).toEqual([])

      // 2. Crossing out of its own package is right; being drawn along the frame is
      //    not. Measured only on the containers this edge actually lives inside.
      const points = paths.get(edge.id) ?? []
      for (const id of containers) {
        const frame = rects.find((r) => r.id === id)
        if (!frame) continue
        const onFrame = points.filter(
          (p) => Math.abs(distanceToRectBorder(p, frame)) < 5
        )
        expect(
          onFrame.length,
          `edge ${short} runs along the frame of ${id.slice(0, 8)} for ${onFrame.length} samples`
        ).toBeLessThan(4)
      }

      // 3. A real margin off its own endpoints — as much as the layout allows. Two
      //    classes 15px apart leave a 15px band, and an edge crossing it runs 7px
      //    from each of them however it is drawn; demanding 10px there is demanding
      //    arithmetic, and the router's honest answer (take the band, down the
      //    middle) would fail a rule it could not have satisfied. So the floor is
      //    what the layout allows — and never zero, because an edge drawn ON its own
      //    node is a defect at any spacing.
      const source = rects.find((r) => r.id === edge.source)
      const target = rects.find((r) => r.id === edge.target)
      const gap =
        source && target ? separation(source, target) : Number.POSITIVE_INFINITY
      const floor = gap >= 2 * MIN_ENDPOINT_MARGIN ? MIN_ENDPOINT_MARGIN : 0

      for (const end of ["source", "target"] as const) {
        const nodeId = end === "source" ? edge.source : edge.target
        const margin = await clearanceToConnectedNode(
          page,
          edge.id,
          nodeId,
          end
        )
        if (floor === 0) {
          expect(
            margin,
            `edge ${short} is drawn ON its ${end} node ${nodeId.slice(0, 8)}, in a ${gap}px gap`
          ).toBeGreaterThan(0)
          continue
        }
        expect(
          margin,
          `edge ${short} hugs its ${end} node ${nodeId.slice(0, 8)} with only ${margin.toFixed(1)}px past the stub`
        ).toBeGreaterThanOrEqual(floor)
      }
    }

    // 4. No two edges drawn on top of one another — the defect diagram 17 was
    //    reported for, and the one the cost model prices per pixel of shared run.
    for (let i = 0; i < model.edges.length; i++) {
      for (let j = i + 1; j < model.edges.length; j++) {
        const a = model.edges[i]
        const b = model.edges[j]
        const run = overlapRunPx(paths.get(a.id) ?? [], paths.get(b.id) ?? [])
        expect(
          run,
          `edges ${a.id.slice(0, 8)} and ${b.id.slice(0, 8)} are drawn on top of ` +
            `each other for ${run}px`
        ).toBeLessThanOrEqual(MAX_SHARED_RUN_PX)
      }
    }
  })
}
