import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * E2E coverage for the group-coloring flow: tag an attribute in the model, look
 * it up by tag, and highlight the result. Unit tests cover the pure kernel; this
 * asserts `getElementIdsByTag` works against a real, rendered editor instance
 * and composes with `setElementHighlights` to paint a member overlay.
 *
 * The editor is reached through the dev-only `window.apollonEditor` seam set in
 * ApollonLocal (same seam as highlight.spec).
 */

function loadFixture(name: string) {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "fixtures", name), "utf-8")
  ) as Record<string, unknown>
}

const fixture = loadFixture("two-class-close.json")

// A stable attribute id from the fixture.
const ATTRIBUTE_ID = "3ff22a38-2fb9-4009-8d62-1027d24581f7"
const TAG = "testAttributes[Context]"
const COLOR = "rgba(34, 197, 94, 0.35)"

type EditorSeam = {
  apollonEditor?: {
    model: { nodes: { id: string; data: Record<string, unknown> }[] }
    getElementIdsByTag: (tag: string) => string[]
    setElementHighlights: (h: Record<string, string> | null) => void
  }
}

test.describe("element tags & group coloring", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, fixture)
    await waitForCanvasReady(page)
    await page.waitForFunction(() =>
      Boolean((window as unknown as EditorSeam).apollonEditor)
    )
  })

  test("addresses a tagged attribute by tag and highlights it", async ({
    page,
  }) => {
    // Author a tag on the known attribute through a model round-trip.
    const ids = await page.evaluate(
      ({ attributeId, tag }) => {
        const editor = (window as unknown as EditorSeam).apollonEditor!
        const model = editor.model
        for (const node of model.nodes) {
          const attributes = node.data.attributes as
            | { id: string; tags?: string[] }[]
            | undefined
          const match = attributes?.find((a) => a.id === attributeId)
          if (match) match.tags = [tag]
        }
        editor.model = model
        return editor.getElementIdsByTag(tag)
      },
      { attributeId: ATTRIBUTE_ID, tag: TAG }
    )

    expect(ids).toEqual([ATTRIBUTE_ID])

    // The #50 flow: color the queried group via the ephemeral highlight overlay.
    const highlightRect = page.locator(
      `g[data-apollon-element-id="${ATTRIBUTE_ID}"] rect[stroke="${COLOR}"]`
    )
    await expect(highlightRect).toHaveCount(0)

    await page.evaluate(
      ({ ids, color }) => {
        const editor = (window as unknown as EditorSeam).apollonEditor!
        editor.setElementHighlights(
          Object.fromEntries(ids.map((id) => [id, color]))
        )
      },
      { ids, color: COLOR }
    )

    await expect(highlightRect).toHaveCount(1)
    await expect(highlightRect).toHaveAttribute("fill", COLOR)
  })
})
