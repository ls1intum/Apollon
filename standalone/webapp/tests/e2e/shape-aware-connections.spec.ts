import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

const __d = path.dirname(fileURLToPath(import.meta.url))
const useCaseFixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "use-case-diagram.json"),
    "utf-8"
  )
)

const BROWSE = "880e8400-e29b-41d4-a716-446655440033" // use-case oval
const INVENTORY = "880e8400-e29b-41d4-a716-446655440035" // use-case oval

async function nodeBox(page: Page, id: string) {
  return (await page
    .locator(`.react-flow__node[data-id="${id}"]`)
    .boundingBox())!
}

/** Screen geometry of a node's inscribed ellipse. */
async function ovalGeom(page: Page, id: string) {
  return page.evaluate((nid) => {
    const r = (
      document.querySelector(
        `.react-flow__node[data-id="${nid}"]`
      ) as HTMLElement
    ).getBoundingClientRect()
    return {
      cx: r.x + r.width / 2,
      cy: r.y + r.height / 2,
      rx: r.width / 2,
      ry: r.height / 2,
    }
  }, id)
}

test("connecting to a use-case oval lands the endpoint on the ellipse curve, not the bbox corner", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, useCaseFixture)
  await waitForCanvasReady(page)

  // Draw a connection from the Browse oval down to the Inventory oval, aiming at
  // the Inventory oval's TOP-RIGHT — a point that, on a rectangle, would be the
  // empty bbox corner OUTSIDE the visible oval.
  const source = page.locator(`.react-flow__node[data-id="${BROWSE}"]`)
  await source.hover()
  await page.waitForTimeout(120)
  const handle = source
    .locator('.react-flow__handle[data-handleid="bottom"]')
    .first()
  const hb = await handle.boundingBox()
  const inv = await nodeBox(page, INVENTORY)
  const aim = { x: inv.x + inv.width - 12, y: inv.y + 12 }

  await page.mouse.move(hb!.x + hb!.width / 2, hb!.y + hb!.height / 2)
  await page.mouse.down()
  await page.mouse.move(aim.x, aim.y, { steps: 16 })
  await page.mouse.up()
  await page.waitForTimeout(250)

  const g = await ovalGeom(page, INVENTORY)
  // The endpoint of some edge closest to the Inventory oval's centre.
  const end = await page.evaluate((geom) => {
    const paths = Array.from(
      document.querySelectorAll(".react-flow__edge path.react-flow__edge-path")
    ) as SVGPathElement[]
    let best: { x: number; y: number } | null = null
    let bestD = Infinity
    for (const p of paths) {
      const ctm = p.getScreenCTM()
      if (!ctm || p.getTotalLength() === 0) continue
      for (const len of [0, p.getTotalLength()]) {
        const q = p.getPointAtLength(len)
        const m = new DOMPoint(q.x, q.y).matrixTransform(ctm)
        const d = Math.hypot(m.x - geom.cx, m.y - geom.cy)
        if (d < bestD) {
          bestD = d
          best = { x: m.x, y: m.y }
        }
      }
    }
    return best
  }, g)

  expect(end, "a connection to the oval must exist").toBeTruthy()
  // On the ellipse, ((x-cx)/rx)² + ((y-cy)/ry)² == 1. The bbox top-right corner
  // would be ~2. Allow a little slack for the arrow-marker gap.
  const onEllipse =
    ((end!.x - g.cx) / g.rx) ** 2 + ((end!.y - g.cy) / g.ry) ** 2
  expect(onEllipse, "endpoint hugs the oval curve").toBeGreaterThan(0.75)
  expect(onEllipse, "endpoint is NOT in the empty bbox corner").toBeLessThan(
    1.4
  )
  // And it landed where we aimed (upper-right), not snapped to a side midpoint.
  expect(end!.x).toBeGreaterThan(g.cx)
  expect(end!.y).toBeLessThan(g.cy)
})
