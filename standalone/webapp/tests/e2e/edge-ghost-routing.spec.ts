import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"
import { type Pt } from "../helpers/edgeGeometry"

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
const rawFixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "edge-obstacle-drag.json"),
    "utf-8"
  )
) as Record<string, unknown>

// Left (100,400) and Right (600,400) sit on one horizontal line; drop the blocker
// squarely between them, on that line, so a straight Left→Right run must cut through
// it. Positioning it in the fixture avoids a setup drag (which panned the canvas and
// desynced the ghost's coordinates from the nodes').
const fixture = {
  ...rawFixture,
  nodes: (
    rawFixture.nodes as { id: string; position: { x: number; y: number } }[]
  ).map((n) =>
    n.id === "cccccccc-0000-0000-0000-000000000003"
      ? { ...n, position: { x: 340, y: 400 } }
      : n
  ),
}

const LEFT = "aaaaaaaa-0000-0000-0000-000000000001"
const BLOCKER = "cccccccc-0000-0000-0000-000000000003"
const RIGHT = "bbbbbbbb-0000-0000-0000-000000000002"

/**
 * Sample the live connection ghost's path in screen coordinates, so its points line
 * up with the node boundingBoxes we compare against. `getPointAtLength` returns the
 * path's local user space; `getScreenCTM` maps that to the screen.
 */
async function sampleGhost(page: Page): Promise<Pt[]> {
  return page.evaluate(() => {
    const path = document.querySelector<SVGPathElement>(
      ".react-flow__connection-path"
    )
    if (!path) return []
    const total = path.getTotalLength()
    const ctm = path.getScreenCTM()
    const out: { x: number; y: number }[] = []
    for (let at = 0; at <= total; at += 3) {
      const p = path.getPointAtLength(at)
      out.push(ctm ? { x: p.x * ctm.a + ctm.e, y: p.y * ctm.d + ctm.f } : p)
    }
    return out
  })
}

/** The screen-space centre of a node's rendered box. */
async function nodeCenter(page: Page, id: string): Promise<Pt> {
  const b = (await page
    .locator(`.react-flow__node[data-id="${id}"]`)
    .boundingBox())!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

test("the connection ghost routes around a node instead of through it", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)

  const leftNode = page.locator(`.react-flow__node[data-id="${LEFT}"]`)
  const rightNode = page.locator(`.react-flow__node[data-id="${RIGHT}"]`)

  // Drag a new connection from the left node's right handle onto the right node — the
  // blocker sits between them, so the routed ghost must go around it.
  await leftNode.hover()
  await page.waitForTimeout(150)
  const handle = leftNode.locator('.react-flow__handle[data-handleid="right"]')
  const hb = (await handle.first().boundingBox())!
  const rightBox = (await rightNode.boundingBox())!
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    rightBox.x + rightBox.width / 2,
    rightBox.y + rightBox.height / 2,
    { steps: 24 }
  )
  await page.waitForTimeout(300)

  const ghost = await sampleGhost(page)
  expect(ghost.length, "no ghost rendered").toBeGreaterThan(0)

  const moved = (await page
    .locator(`.react-flow__node[data-id="${BLOCKER}"]`)
    .boundingBox())!
  const insideBlocker = (p: Pt) =>
    p.x > moved.x + 4 &&
    p.x < moved.x + moved.width - 4 &&
    p.y > moved.y + 4 &&
    p.y < moved.y + moved.height - 4

  await page.mouse.up()

  // The test proves its own premise: the straight line between the two node centres
  // — what any connection between them must contend with — passes through the blocker.
  // Without this guard, a blocker that drifted out of the way would leave a test that
  // passes while asserting nothing, the most expensive kind of green.
  const from = await nodeCenter(page, LEFT)
  const to = await nodeCenter(page, RIGHT)
  const straightHitsBlocker = Array.from(
    { length: 200 },
    (_, i) => i / 199
  ).some((t) =>
    insideBlocker({
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    })
  )
  expect(
    straightHitsBlocker,
    `the blocker (${JSON.stringify(moved)}) is not between the nodes — this test would assert nothing`
  ).toBe(true)

  // …and the ghost, which is routed, does not.
  const inside = ghost.filter(insideBlocker)
  expect(
    inside.length,
    `the ghost was drawn through the node it should route around (${inside.length} samples inside)`
  ).toBe(0)
})
