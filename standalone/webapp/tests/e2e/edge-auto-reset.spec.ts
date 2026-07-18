import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * The "Reset routing" affordance and the pinned-endpoint highlight.
 *
 * An edge is FULLY auto only when it has neither hand-drawn waypoints NOR pinned
 * endpoint anchors. The reset button (and the filled "anchored" grips) must appear
 * whenever EITHER manual state is present — an edge whose path is auto but whose
 * anchors are pinned used to hide the button, leaving no way back to auto anchoring.
 */

const __dirname2 = path.dirname(fileURLToPath(import.meta.url))
const load = (name: string) =>
  JSON.parse(
    fs.readFileSync(path.join(__dirname2, "..", "fixtures", name), "utf-8")
  ) as Record<string, unknown> & { edges: { id: string }[] }

const pinnedFixture = load("edge-pinned-anchors.json")

async function selectEdgeOnPath(page: Page, id: string): Promise<void> {
  const pt = await page.evaluate((eid) => {
    const p = document.querySelector(
      `.react-flow__edge[data-id="${eid}"] path.react-flow__edge-path`
    ) as SVGPathElement | null
    if (!p) return null
    const ctm = p.getScreenCTM()
    if (!ctm) return null
    const q = p.getPointAtLength(p.getTotalLength() / 2)
    const m = new DOMPoint(q.x, q.y).matrixTransform(ctm)
    return { x: m.x, y: m.y }
  }, id)
  if (!pt) throw new Error(`edge ${id} path not found`)
  await page.mouse.click(pt.x, pt.y)
  await page.waitForTimeout(200)
}

test("a pinned-anchor edge exposes the reset button and highlights both anchored ends", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, pinnedFixture)
  await waitForCanvasReady(page)
  const id = pinnedFixture.edges[0].id

  await selectEdgeOnPath(page, id)

  const edge = page.locator(`.react-flow__edge[data-id="${id}"]`)
  // Both ends are pinned, so both grips render filled ("anchored").
  await expect(edge.locator(".edge-endpoint-grip--pinned")).toHaveCount(2)

  const resetButton = page.getByRole("button", { name: "Reset routing" })
  await expect(resetButton).toBeVisible()

  // Reset hands the edge fully back to the router: the anchors clear, so the
  // filled grips and the button itself disappear.
  await resetButton.click()
  await page.waitForTimeout(300)
  await expect(edge.locator(".edge-endpoint-grip--pinned")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Reset routing" })).toHaveCount(
    0
  )
})

test("a fully auto edge shows no reset button and no anchored grips", async ({
  page,
}) => {
  // Same geometry, but the edge keeps its default auto anchoring (no custom
  // anchors, no waypoints) — nothing to reset.
  const auto = load("edge-pinned-anchors.json")
  const edgeData = (auto.edges[0] as { data: Record<string, unknown> }).data
  delete edgeData.sourceAnchor
  delete edgeData.targetAnchor

  await openFixtureInLocalEditor(page, auto)
  await waitForCanvasReady(page)
  const id = auto.edges[0].id

  await selectEdgeOnPath(page, id)

  const edge = page.locator(`.react-flow__edge[data-id="${id}"]`)
  await expect(edge.locator(".edge-endpoint-grip--pinned")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Reset routing" })).toHaveCount(
    0
  )
})
