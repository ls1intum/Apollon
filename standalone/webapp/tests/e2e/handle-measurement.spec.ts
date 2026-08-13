import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

const __d = path.dirname(fileURLToPath(import.meta.url))
const loadFixture = (name: string) =>
  JSON.parse(
    fs.readFileSync(path.join(__d, "..", "fixtures", name), "utf-8")
  ) as Record<string, unknown>

// This fixture's single edge is anchored to a "between" slot — an addressable
// handle no node ever draws — which is the case both assertions below turn on.
const edgeFixture = loadFixture("two-class-fresh-edge.json")

type EdgeAnchor = { sourceHandle: string; targetHandle: string }
const anchors = (edgeFixture.edges as EdgeAnchor[]).flatMap((edge) => [
  edge.sourceHandle,
  edge.targetHandle,
])

/**
 * React Flow measures a node's handles once and reuses that cache for the life
 * of the node. Nothing in the library forces a re-measure and hovering does not
 * trigger one, so a handle without a box at this moment — hidden by CSS, or not
 * yet mounted — is cached at zero size, and the edge that points at it resolves
 * no endpoint. This has broken twice, in both of those ways.
 *
 * Idle handles are meant to be invisible, which is fine: `visibility`, `opacity`
 * and a transparent fill all keep the box. `display: none` and never mounting do
 * not.
 */
test("every handle an edge points at is measurable while the diagram sits idle", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, edgeFixture)
  await waitForCanvasReady(page)

  // Park the pointer off-canvas: the failure only appears with nothing hovered.
  await page.mouse.move(0, 0)

  const measured = await page.evaluate(() => {
    const boxed = (element: Element) => {
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }
    const handles = [...document.querySelectorAll(".react-flow__handle")]
    return {
      total: handles.length,
      collapsed: handles
        .filter((handle) => !boxed(handle))
        .map((handle) => handle.getAttribute("data-handleid") ?? "?"),
      boxedIds: handles
        .filter(boxed)
        .map((handle) => handle.getAttribute("data-handleid") ?? "?"),
    }
  })

  expect(
    measured.collapsed,
    "a handle measured at zero size resolves to a point outside its node"
  ).toEqual([])
  // Without this the assertion above is vacuous: no handles at all also has
  // nothing collapsed, and not mounting them is the other way this breaks.
  expect(measured.total).toBeGreaterThan(0)
  for (const anchor of anchors) {
    expect(
      measured.boxedIds,
      `edge anchor ${anchor} has no measurable handle`
    ).toContain(anchor)
  }

  // The endpoint an unmeasured handle costs is the whole edge, so assert the
  // visible consequence too.
  await expect(page.locator(".react-flow__edge")).toHaveCount(
    (edgeFixture.edges as unknown[]).length
  )
})
