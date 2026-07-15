import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Parity gate for the central edge-geometry solver.
 *
 * The `EdgeSolverParityProbe` (dev/e2e only) runs `computeAllEdgeGeometry` over
 * the live React Flow store and compares each edge's solver route against the
 * polyline that edge ACTUALLY published (`edgeGeometryStore.geometryById`, the
 * ground truth of today's per-edge routing). It writes the result to
 * `window.__apollonSolverParity`.
 *
 * These are the same real-diagram fixtures the routing oracle uses. If the
 * single-pass solver reproduces the multi-frame per-edge cascade, every edge is
 * byte-identical and `mismatchCount` is zero. This must be green before the
 * solver is wired into rendering — it proves parity on real, measured diagrams,
 * which jsdom cannot (handle bounds need a real browser layout).
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
type Model = { edges: { id: string }[] }
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

type ParityResult = {
  total: number
  mismatchCount: number
  mismatches: {
    id: string
    type?: string
    solver?: { x: number; y: number }[]
    actual: { x: number; y: number }[]
  }[]
}

test.beforeEach(async ({ page }) => {
  // Opt this page's parity probe in before the app mounts (it is inert
  // otherwise, so it never burdens the rest of the e2e suite).
  await page.addInitScript(() => {
    ;(
      window as unknown as { __apollonEnableSolverParity?: boolean }
    ).__apollonEnableSolverParity = true
  })
})

for (const file of DIAGRAMS) {
  const model = load(file)

  test(`central solver matches per-edge routing for ${file}`, async ({
    page,
  }) => {
    await openFixtureInLocalEditor(
      page,
      model as unknown as Record<string, unknown>
    )
    await waitForCanvasReady(page)

    // Wait until every edge has published and the probe has compared them.
    await expect
      .poll(
        async () =>
          await page.evaluate(() => {
            const p = (
              window as unknown as { __apollonSolverParity?: ParityResult }
            ).__apollonSolverParity
            return p?.total ?? 0
          }),
        { timeout: 8000, message: "solver parity probe never ran" }
      )
      .toBeGreaterThanOrEqual(model.edges.length)

    const parity = (await page.evaluate(
      () =>
        (window as unknown as { __apollonSolverParity?: ParityResult })
          .__apollonSolverParity
    )) as ParityResult

    expect(
      parity.mismatchCount,
      `solver diverged from per-edge routing on ${parity.mismatchCount}/${
        parity.total
      } edges: ${JSON.stringify(parity.mismatches, null, 2)}`
    ).toBe(0)
  })
}
