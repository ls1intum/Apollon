import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * E2E coverage for the host-driven highlight API
 * (`ApollonEditor.setElementHighlights`). The v4 rewrite dropped v3's
 * per-element `highlight` field, so this asserts the real-browser behaviour
 * the unit test can't: that a highlight actually paints an overlay onto a
 * rendered node and a class member, and that clearing it removes the overlay.
 *
 * The editor instance is reached through the dev-only `window.apollonEditor`
 * seam set in ApollonLocal; the API itself has no UI affordance to click.
 */

function loadFixture(name: string) {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "fixtures", name), "utf-8")
  ) as Record<string, unknown>
}

const fixture = loadFixture("two-class-close.json")
const edgeFixture = loadFixture("two-class-fresh-edge.json")

// Stable ids from the fixture: a whole class node and one of its attributes.
const NODE_ID = "95aac2b6-3e6b-4e6d-9201-52a498e6ea20"
const ATTRIBUTE_ID = "3ff22a38-2fb9-4009-8d62-1027d24581f7"
// Stable id from the edge fixture: the single relationship/edge.
const EDGE_ID = "231f7ef5-b43d-4187-8996-f7726ed6e919"
const COLOR = "rgba(23, 162, 184, 0.3)"

function setHighlights(record: Record<string, string> | null) {
  const editor = (
    window as Window & {
      apollonEditor?: { setElementHighlights: (h: unknown) => void }
    }
  ).apollonEditor
  editor?.setElementHighlights(record)
}

test.describe("host-driven element highlighting", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, fixture)
    await waitForCanvasReady(page)
    await page.waitForFunction(() =>
      Boolean((window as unknown as { apollonEditor?: unknown }).apollonEditor)
    )
  })

  test("rings a node and removes it when cleared", async ({ page }) => {
    const overlay = page.locator(
      `[data-apollon-element-id="${NODE_ID}"] > div[aria-hidden="true"]`
    )
    await expect(overlay).toHaveCount(0)

    await page.evaluate(setHighlights, { [NODE_ID]: COLOR })
    await expect(overlay).toHaveCount(1)
    // A ring, not a fill. This overlay is a positioned sibling of the node's
    // SVG, so it paints above everything the node draws — including the
    // assessment badge at its edge. A wash sat on top of the very indicator the
    // reader needs; an outline marks the element without hiding anything.
    await expect
      .poll(async () =>
        overlay.evaluate((el) => getComputedStyle(el).boxShadow)
      )
      .toContain(COLOR)
    await expect(overlay).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")

    await page.evaluate(setHighlights, null)
    await expect(overlay).toHaveCount(0)
  })

  test("rings a class member (attribute) without covering it", async ({
    page,
  }) => {
    const highlightRect = page.locator(
      `g[data-apollon-element-id="${ATTRIBUTE_ID}"] rect[stroke="${COLOR}"]`
    )
    await expect(highlightRect).toHaveCount(0)

    await page.evaluate(setHighlights, { [ATTRIBUTE_ID]: COLOR })
    await expect(highlightRect).toHaveCount(1)
    // Unfilled. SVG paints in document order and this rect comes after the row's
    // content, so a fill would bury the row's text and its assessment badge —
    // the very thing the highlight is pointing at.
    await expect(highlightRect).toHaveAttribute("fill", "none")

    await page.evaluate(setHighlights, null)
    await expect(highlightRect).toHaveCount(0)
  })
})

test.describe("host-driven element highlighting (edges)", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, edgeFixture)
    await waitForCanvasReady(page)
    await page.waitForFunction(() =>
      Boolean((window as unknown as { apollonEditor?: unknown }).apollonEditor)
    )
  })

  test("glows an edge with a drop-shadow filter and removes it when cleared", async ({
    page,
  }) => {
    // Edges are g-wrapped thin paths: the highlight is a drop-shadow glow on
    // the stroke, a distinct rendering strategy from the node div overlay. Like
    // the node wrapper, the g only exists while a highlight is set.
    const edge = page.locator(`g[data-apollon-element-id="${EDGE_ID}"]`)
    await expect(edge).toHaveCount(0)

    await page.evaluate(setHighlights, { [EDGE_ID]: COLOR })
    await expect(edge).toHaveCount(1)

    // The glow is on the STROKE, not on the group. An SVG filter applies to its
    // whole subtree, and that subtree includes the edge's assessment badge —
    // filtering the group repainted a green "correct" check in the highlight
    // colour.
    await expect
      .poll(async () =>
        edge
          .locator(".react-flow__edge-path")
          .first()
          .evaluate((el) => getComputedStyle(el).filter)
      )
      .toMatch(/drop-shadow/)
    expect(await edge.evaluate((el) => getComputedStyle(el).filter)).toBe(
      "none"
    )

    await page.evaluate(setHighlights, null)
    await expect(edge).toHaveCount(0)
  })
})
