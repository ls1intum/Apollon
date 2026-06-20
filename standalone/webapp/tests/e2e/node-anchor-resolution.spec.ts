import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Resolution guarantee: an edge persisted with a NON-key `side:ratio` anchor
 * (e.g. a fine grid point like `l:0.65`, not one of the always-visible key
 * handles) must still render — the target node must back it with a (hidden)
 * DOM handle so React Flow's getEdgePosition resolves it. Without that backing
 * handle React Flow silently drops the edge. This is the regression net for
 * the anchor-model rework.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "two-class-nonkey-ratio-edge.json"),
    "utf-8"
  )
) as Record<string, unknown>

const TARGET = "32659cdc-bd03-46f3-918c-ee8dbba9c15b"

test("an edge on a non-key ratio anchor renders and is backed by a DOM handle", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)

  // The edge survived import + render (not dropped for a missing handle).
  const edgePath = page
    .locator(
      '.react-flow__edge[data-id="edge-nonkey-ratio"] path.react-flow__edge-path'
    )
    .first()
  await expect(edgePath).toHaveCount(1)
  const d = await edgePath.getAttribute("d")
  expect(d, "edge should have a rendered path").toBeTruthy()

  // The referenced non-key anchor is backed by an addressable handle on the
  // target node so reconnect/measurement keep working.
  const hasHandle = await page.evaluate((targetId) => {
    const node = document.querySelector(
      `.react-flow__node[data-id="${targetId}"]`
    )
    return !!node?.querySelector('.react-flow__handle[data-handleid="l:0.65"]')
  }, TARGET)
  expect(hasHandle, "target node should back the l:0.65 anchor").toBe(true)
})
