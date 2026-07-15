import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"
import { sampleEdgePath, type Pt } from "../helpers/edgeGeometry"

/**
 * End-to-end parity between the two routing engines at the RENDERED level.
 *
 * The static-store parity gate (edge-solver-parity.spec.ts) proves the solver's
 * computed routes equal per-edge routing. This proves the other half: that the
 * edge COMPONENTS, rewired to read the solver's route in `central` mode, draw
 * exactly what they draw in `per-edge` mode. It opens each oracle fixture in
 * both modes, samples every edge's rendered path, and asserts they coincide.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
type Model = { id: string; edges: { id: string }[] }
const load = (file: string) =>
  JSON.parse(
    fs.readFileSync(path.join(__d, "..", "fixtures", file), "utf-8")
  ) as Model

const DIAGRAMS = [
  "edge-margin-around-a.json",
  "edge-margin-5.json",
  "edge-diag-6.json",
  "edge-diag-7.json",
  "edge-diag-8.json",
  "edge-diag-9.json",
  "edge-diag-13.json",
  "edge-diag-14.json",
  "edge-diag-15.json",
  "edge-diag-16.json",
  "edge-diag-17.json",
  "edge-diag-18.json",
]

const SAMPLE_PX = 6
const TOL = 0.6 // sub-pixel: rendering/sampling jitter, not a routing difference

async function sampleAll(
  page: import("@playwright/test").Page,
  model: Model,
  edgeRouting: "central" | "per-edge"
): Promise<Map<string, Pt[]>> {
  await openFixtureInLocalEditor(
    page,
    model as unknown as Record<string, unknown>,
    { edgeRouting }
  )
  await waitForCanvasReady(page)
  const paths = new Map<string, Pt[]>()
  for (const edge of model.edges) {
    paths.set(edge.id, await sampleEdgePath(page, edge.id, SAMPLE_PX))
  }
  return paths
}

for (const file of DIAGRAMS) {
  const model = load(file)

  test(`central and per-edge render the same routes for ${file}`, async ({
    page,
  }) => {
    const perEdge = await sampleAll(page, model, "per-edge")
    const central = await sampleAll(page, model, "central")

    for (const edge of model.edges) {
      const a = perEdge.get(edge.id) ?? []
      const b = central.get(edge.id) ?? []
      const short = edge.id.slice(0, 8)
      expect(
        b.length,
        `edge ${short}: central sampled ${b.length} pts vs per-edge ${a.length}`
      ).toBe(a.length)
      for (let i = 0; i < a.length; i++) {
        expect(
          Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y),
          `edge ${short} point ${i}: per-edge (${a[i].x},${a[i].y}) vs central (${b[i].x},${b[i].y})`
        ).toBeLessThanOrEqual(TOL)
      }
    }
  })
}
