import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"
import { readNodeRects, type Pt } from "../helpers/edgeGeometry"

/**
 * The ghost you drag must be the edge you get.
 *
 * The preview used to be a raw smooth-step curve with a hard-coded offset: it
 * knew nothing about the nodes in its way, the margins it should keep, or the
 * edges it should not cross. So it drew straight through a node and then snapped
 * to a completely different route on release — and the gap widened with every
 * improvement made to the real router. It now goes through the same routing
 * function, with the same obstacles.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "edge-obstacle-drag.json"),
    "utf-8"
  )
) as Record<string, unknown>

const LEFT = "aaaaaaaa-0000-0000-0000-000000000001"
const BLOCKER = "cccccccc-0000-0000-0000-000000000003"

/** Sample the live connection ghost's path, in flow coordinates. */
async function sampleGhost(page: Page): Promise<Pt[]> {
  return page.evaluate(() => {
    const path = document.querySelector<SVGPathElement>(
      ".react-flow__connection-path"
    )
    if (!path) return []
    const d = path.getAttribute("d")
    if (!d) return []
    const total = path.getTotalLength()
    const out: { x: number; y: number }[] = []
    for (let at = 0; at <= total; at += 3) {
      const p = path.getPointAtLength(at)
      out.push({ x: p.x, y: p.y })
    }
    return out
  })
}

test("the connection ghost routes around a node instead of through it", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)

  const rects = await readNodeRects(page)
  const blocker = rects.find((r) => r.id === BLOCKER)!

  // Park the blocker directly between the left node's right handle and the point
  // we will drag to, so a naive straight/step ghost must cut through it.
  const leftNode = page.locator(`.react-flow__node[data-id="${LEFT}"]`)
  const blockerNode = page.locator(`.react-flow__node[data-id="${BLOCKER}"]`)
  const leftBox = (await leftNode.boundingBox())!
  const blockerBox = (await blockerNode.boundingBox())!

  const edgeY = leftBox.y + leftBox.height / 2
  await page.mouse.move(
    blockerBox.x + blockerBox.width / 2,
    blockerBox.y + blockerBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(leftBox.x + leftBox.width + 220, edgeY, { steps: 20 })
  await page.mouse.up()
  await page.waitForTimeout(400)

  // Now drag a NEW connection from the left node's right handle to a point on
  // the far side of the blocker, and hold it there.
  await leftNode.hover()
  await page.waitForTimeout(150)
  const handle = leftNode.locator('.react-flow__handle[data-handleid="right"]')
  const hb = (await handle.first().boundingBox())!
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(leftBox.x + leftBox.width + 420, edgeY, { steps: 24 })
  await page.waitForTimeout(300)

  const ghost = await sampleGhost(page)
  expect(ghost.length, "no ghost rendered").toBeGreaterThan(0)

  // Re-read the blocker where it now sits.
  const moved = (await readNodeRects(page)).find((r) => r.id === BLOCKER)!
  const insideBlocker = (p: Pt) =>
    p.x > moved.x + 4 &&
    p.x < moved.x + moved.width - 4 &&
    p.y > moved.y + 4 &&
    p.y < moved.y + moved.height - 4

  await page.mouse.up()

  // The test proves its own premise: a naive straight run from where the ghost
  // starts to where it ends MUST hit the blocker. Without this, a blocker that
  // drifted out of the way would leave a test that passes while asserting
  // nothing — the most expensive kind of green.
  const from = ghost[0]
  const to = ghost[ghost.length - 1]
  const naiveHitsBlocker = Array.from({ length: 200 }, (_, i) => i / 199).some(
    (t) =>
      insideBlocker({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      })
  )
  expect(
    naiveHitsBlocker,
    `the blocker (${JSON.stringify(moved)}, originally ${JSON.stringify(blocker)}) is not actually in the way — this test is asserting nothing`
  ).toBe(true)

  // …and the ghost, which is routed, does not.
  const inside = ghost.filter(insideBlocker)
  expect(
    inside.length,
    `the ghost was drawn through the node it should route around (${inside.length} samples inside)`
  ).toBe(0)
})
