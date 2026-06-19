import { test, expect, type Page, type Locator } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Behavioural E2E coverage for editing class-diagram association labels —
 * source/target multiplicity and role — through the edge edit popover.
 *
 * Asserts on externally-observable results: the values the controls hold, the
 * labels rendered on the canvas edge, and that the popover stays in sync with
 * the live edge after a Swap (which exchanges the association's ends). The
 * Swap check is the important one: the popover must reactively reflect the
 * current edge, not a value captured once during render.
 */

const __filename2 = fileURLToPath(import.meta.url)
const __dirname2 = path.dirname(__filename2)
const classDiagram = JSON.parse(
  fs.readFileSync(
    path.join(__dirname2, "..", "fixtures", "class-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>

// Bi-directional association between "Dog" and "iMovable" (has editable ends).
const ASSOCIATION = "edge-bidirectional-dog-imovable"

function edgeById(page: Page, id: string): Locator {
  return page.locator(`.react-flow__edge[data-id="${id}"]`)
}

async function openEdgeEditPopover(page: Page) {
  // Select the edge (a bbox-centre click misses the L-shaped path), revealing
  // its toolbar, then open the edit popover.
  await edgeById(page, ASSOCIATION)
    .locator("path")
    .first()
    .dispatchEvent("click")
  await page.getByRole("button", { name: "Edit edge" }).click()
  // The first popover field confirms the popover is open.
  await page
    .getByTestId("edge-source-multiplicity")
    .waitFor({ state: "visible", timeout: 10_000 })
}

test.describe("Class association multiplicity & role editing", () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureInLocalEditor(page, classDiagram)
    await waitForCanvasReady(page)
  })

  test("editing the controls updates the canvas labels", async ({ page }) => {
    await openEdgeEditPopover(page)

    await page.getByTestId("edge-source-multiplicity").fill("1..*")
    await page.getByTestId("edge-source-role").fill("owner")
    await page.getByTestId("edge-target-multiplicity").fill("1")
    await page.getByTestId("edge-target-role").fill("pet")

    // Controls hold what was typed.
    await expect(page.getByTestId("edge-source-multiplicity")).toHaveValue(
      "1..*"
    )
    await expect(page.getByTestId("edge-target-role")).toHaveValue("pet")

    // The edge renders the labels on the canvas.
    const edge = edgeById(page, ASSOCIATION)
    await expect(edge.locator("text", { hasText: "1..*" })).toBeVisible()
    await expect(edge.locator("text", { hasText: "owner" })).toBeVisible()
    await expect(edge.locator("text", { hasText: "pet" })).toBeVisible()
  })

  test("popover stays in sync with the edge after swapping ends", async ({
    page,
  }) => {
    await openEdgeEditPopover(page)

    // Each field is labelled with its end's node name; the association runs
    // Dog → iMovable, so the source field starts labelled for "Dog".
    const sourceMultiplicity = page.getByTestId("edge-source-multiplicity")
    await expect(sourceMultiplicity).toHaveAccessibleName(/Dog/)

    await page.getByRole("button", { name: "Swap source and target" }).click()

    // Swapping exchanges the ends, so the source field must now be labelled for
    // the new source node ("iMovable"). A popover that read the edge once during
    // render (then was memoized by the compiler) stays stale — this catches it.
    await expect(sourceMultiplicity).toHaveAccessibleName(/movable/i)
  })
})
