import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Guards against the "gap between edge tip and node after resizing while zoomed
 * out" bug. React Flow derives an edge's connection point from the node handle
 * box and re-measures it on resize; a zoom-scaled handle box therefore shifted
 * the edge endpoint by half the box (a visible gap) when resizing at low zoom.
 * The handle box is now a constant size, so the edge endpoint stays glued to
 * the node boundary at every zoom.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "package-edge.json"),
    "utf-8"
  )
) as Record<string, unknown>

// Distance from the edge's SOURCE endpoint to the source node's right boundary
// (the edge leaves pkgA's right side). ~0 = glued; large = visible gap.
async function rightSideGap(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector(
      '.react-flow__node[data-id="pkgA"]'
    ) as HTMLElement
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
    const right = m.e + el.offsetWidth
    const d =
      document
        .querySelector(
          '.react-flow__edge[data-id="pkgEdge"] .react-flow__edge-path'
        )
        ?.getAttribute("d") || ""
    const first = [...d.matchAll(/(-?[\d.]+)\s+(-?[\d.]+)/g)].map((mm) => ({
      x: +mm[1],
    }))[0]
    return first ? Math.abs(right - first.x) : Number.NaN
  })
}

async function resizePkgWider(page: Page): Promise<void> {
  const node = page.locator('.react-flow__node[data-id="pkgA"]')
  await node.hover()
  await page.waitForTimeout(150)
  const handle = node.locator(".react-flow__resize-control.handle.bottom.right")
  const b = (await handle.first().boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + 80, b.y + 40, { steps: 14 })
  await page.mouse.up()
  await page.waitForTimeout(400)
}

test("resizing a node while zoomed out keeps the edge glued to the node", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)

  // Zoom out to the minimum (the button disables once there).
  const zoomOut = page.locator(".react-flow__controls-zoomout").first()
  for (let i = 0; i < 10; i++) {
    if (!(await zoomOut.isEnabled())) break
    await zoomOut.click()
    await page.waitForTimeout(50)
  }

  await resizePkgWider(page)

  // After resizing at low zoom the edge endpoint must stay on the node's
  // boundary. Before the fix this was ~7px out at zoom 0.4.
  const gap = await rightSideGap(page)
  expect(
    gap,
    `edge endpoint floated ${gap}px off the node after resize`
  ).toBeLessThanOrEqual(3)
})
