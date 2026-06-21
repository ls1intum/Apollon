import { test, expect, type Page, type Locator } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Behavioural E2E coverage for the Entity-Relationship (Chen) diagram type:
 * the Chen-notation shapes render and the cardinality connector popover edits
 * the on-canvas label. Connection validity is covered at the unit level
 * (classifyErConnection in library/lib/utils/erUtils.ts).
 */

const __filename2 = fileURLToPath(import.meta.url)
const __dirname2 = path.dirname(__filename2)
const erDiagram = JSON.parse(
  fs.readFileSync(
    path.join(__dirname2, "..", "fixtures", "entity-relationship-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>

function nodeById(page: Page, id: string): Locator {
  return page.locator(`.react-flow__node[data-id="${id}"]`)
}

function edgeById(page: Page, id: string): Locator {
  return page.locator(`.react-flow__edge[data-id="${id}"]`)
}

const STUDENT = "11111111-1111-4111-a111-111111111111"
const ENROLLS = "22222222-2222-4222-a222-222222222222"

test.describe("Entity-Relationship (Chen) diagram", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, erDiagram)
    await waitForCanvasReady(page)
  })

  test("renders the Chen shapes (entity rect, relationship diamond, attribute ellipse)", async ({
    page,
  }) => {
    // Entity = rectangle, relationship = diamond (polygon), attribute = ellipse.
    await expect(nodeById(page, STUDENT).locator("rect").first()).toBeVisible()
    await expect(
      nodeById(page, ENROLLS).locator("polygon").first()
    ).toBeVisible()
    await expect(
      page.locator(".react-flow__node ellipse").first()
    ).toBeVisible()
  })

  test("editing a connector's cardinality updates the canvas label", async ({
    page,
  }) => {
    await edgeById(page, "edge-student-enrolls")
      .locator("path")
      .first()
      .dispatchEvent("click")
    await page.getByRole("button", { name: "Edit edge" }).click()
    const cardinality = page.getByTestId("er-cardinality")
    await cardinality.waitFor({ state: "visible", timeout: 10_000 })

    // Use a value that can't collide with a preset button or another edge's
    // label so the page-scoped text query is unambiguous. The mid-edge label
    // renders in a separate SVG layer, not as a DOM child of the edge group.
    await cardinality.fill("0..7")
    await expect(
      page.locator(".react-flow__viewport").getByText("0..7", { exact: true })
    ).toBeVisible()
  })
})
