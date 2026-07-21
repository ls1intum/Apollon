import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

const __d = path.dirname(fileURLToPath(import.meta.url))

/**
 * Regression: a hand-drawn multi-corner edge whose anchors are auto ({}) must LOAD with
 * every bend intact. The re-projection effect used to fire with the solver's fallback
 * (a bare source->target straight line) before the real route landed, normalize THAT to
 * the plain auto route, and overwrite the stored manual bends — flattening a 6-corner
 * path to 2 corners on load. The effect now waits for the solver's actual route.
 */
test("a hand-drawn multi-corner edge keeps all its bends on load", async ({
  page,
}) => {
  const fx = JSON.parse(
    fs.readFileSync(
      path.join(__d, "..", "fixtures", "edge-manual-bends-multi-corner.json"),
      "utf-8"
    )
  )
  const storedCorners = fx.edges[0].data.points.length
  expect(storedCorners).toBeGreaterThanOrEqual(6)

  await openFixtureInLocalEditor(page, fx)
  await waitForCanvasReady(page)
  await page.waitForTimeout(600)

  const cornerCount = await page.evaluate(() => {
    const d = document
      .querySelector(".react-flow__edge path.react-flow__edge-path")
      ?.getAttribute("d")
    if (!d) return 0
    // count L/M commands = vertices
    return (d.match(/[ML]/g) || []).length
  })

  // The full hand-drawn path survived (not flattened to a 2-3 point auto route).
  expect(
    cornerCount,
    "the multi-corner hand-drawn path must not collapse on load"
  ).toBeGreaterThanOrEqual(storedCorners - 1)
})
