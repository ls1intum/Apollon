import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"
import {
  findEdgeNodeOverlaps,
  minClearanceToOtherNodes,
} from "../helpers/edgeGeometry"

/**
 * The invariant a user keeps hitting by hand: a rendered edge must not run
 * through a node body it does not connect to, nor cut back across its own source
 * or target. Unit tests prove the router computes clean routes from a model;
 * this proves the *rendered* edge — after real measurement, the obstacle set the
 * hook actually assembles, and a real pointer drag — is clean too. That gap
 * between "the pure function is correct" and "the thing on screen is correct" is
 * exactly where the reported overlaps lived.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "edge-obstacle-drag.json"),
    "utf-8"
  )
) as Record<string, unknown>

const EDGE = "edge-left-right"
const LEFT = "aaaaaaaa-0000-0000-0000-000000000001"
const RIGHT = "bbbbbbbb-0000-0000-0000-000000000002"
const BLOCKER = "cccccccc-0000-0000-0000-000000000003"
const ENDPOINTS = { source: LEFT, target: RIGHT }

/** Drag `nodeId` so its centre lands on the screen point (x, y). */
async function dragNodeCentreTo(
  page: Page,
  nodeId: string,
  x: number,
  y: number
): Promise<void> {
  const node = page.locator(`.react-flow__node[data-id="${nodeId}"]`)
  const box = (await node.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(x, y, { steps: 24 })
  await page.mouse.up()
  await page.waitForTimeout(400)
}

test("a straight edge does not overlap either node it connects", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)

  const overlaps = await findEdgeNodeOverlaps(page, EDGE, ENDPOINTS)
  expect(
    overlaps,
    `edge cut into: ${overlaps.map((o) => `${o.nodeId} by ${o.depthPx.toFixed(1)}px`).join(", ")}`
  ).toEqual([])
})

test("dragging a node onto an edge makes the edge route around it, not through it", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)

  // Drop the blocker onto the middle of the horizontal edge: between the two
  // connected nodes, at their shared vertical centre.
  const left = (await page
    .locator(`.react-flow__node[data-id="${LEFT}"]`)
    .boundingBox())!
  const right = (await page
    .locator(`.react-flow__node[data-id="${RIGHT}"]`)
    .boundingBox())!
  const midX = (left.x + left.width / 2 + right.x + right.width / 2) / 2
  const edgeY = left.y + left.height / 2
  await dragNodeCentreTo(page, BLOCKER, midX, edgeY)

  const overlaps = await findEdgeNodeOverlaps(page, EDGE, ENDPOINTS)
  const throughBlocker = overlaps.filter((o) => o.nodeId === BLOCKER)
  expect(
    throughBlocker,
    `edge still runs through the blocker: ${throughBlocker
      .map((o) => `${o.depthPx.toFixed(1)}px`)
      .join(", ")}`
  ).toEqual([])
  // And it did not solve the blocker by cutting through its own endpoints.
  expect(overlaps).toEqual([])

  // Routing around the blocker keeps a real margin from it, not a hairline graze
  // — the router inflates every obstacle before searching.
  const clearance = await minClearanceToOtherNodes(page, EDGE, ENDPOINTS)
  expect(
    clearance,
    `edge grazed the blocker with only ${clearance.toFixed(1)}px clearance`
  ).toBeGreaterThanOrEqual(5)
})

test("dragging the source under the edge does not overlap its own body", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)

  // Pull the right-hand node up and left so the edge, which leaves the left node
  // on its right side, has to work around geometry that used to let it clip its
  // own source body.
  const left = (await page
    .locator(`.react-flow__node[data-id="${LEFT}"]`)
    .boundingBox())!
  await dragNodeCentreTo(
    page,
    RIGHT,
    left.x - left.width,
    left.y + left.height / 2
  )

  const overlaps = await findEdgeNodeOverlaps(page, EDGE, ENDPOINTS)
  expect(
    overlaps,
    `edge cut into: ${overlaps.map((o) => `${o.nodeId} by ${o.depthPx.toFixed(1)}px`).join(", ")}`
  ).toEqual([])
})
