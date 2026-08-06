import { test, expect, type Page } from "@playwright/test"

/**
 * The feedback index and the canvas drive each other: choosing an entry reveals
 * its element and opens the feedback (`revealAssessment`), and selecting on the
 * canvas marks the entry (`subscribeToAssessmentSelection`). "See feedback" is
 * the student's read-only half of assessment, which has its own popover.
 */
async function selectMode(page: Page, label: string) {
  await page.getByTestId("playground-mode").click()
  await page.getByRole("option", { name: label }).click()
}

async function placeNode(page: Page) {
  const preview = page
    .locator('[data-testid="apollon-palette"]')
    .first()
    .locator("[data-draggable-preview]")
    .first()
  await expect(preview).toBeVisible()
  const box = await preview.boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await expect(page.locator(".react-flow__node")).toHaveCount(1)
  await page.keyboard.press("Escape")
}

async function scoreFirstElement(page: Page) {
  await selectMode(page, "Assessment (give feedback)")
  await page.locator(".react-flow__node").first().click({ force: true })
  const points = page.locator(".apollon-popover input").first()
  await expect(points).toBeVisible()
  await points.fill("3")
  await page.keyboard.press("Escape")
}

test.describe("assessment feedback index", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/playground")
    await page.waitForSelector('[data-testid="apollon-palette"]', {
      timeout: 30_000,
    })
    await placeNode(page)
  })

  test("lists a scored element and reveals it when chosen", async ({
    page,
  }) => {
    await scoreFirstElement(page)

    const entry = page.getByRole("button", { name: /3/ }).last()
    await expect(entry).toBeVisible()

    await selectMode(page, "Assessment (see feedback)")
    await page.waitForTimeout(300)

    // Choosing the entry opens the READ-ONLY popover — the student's view.
    await page.getByRole("button", { name: /3/ }).last().click()
    await expect(page.locator(".apollon-popover")).toBeVisible()
    // Read-only: no editable points field.
    await expect(page.locator(".apollon-popover input")).toHaveCount(0)
  })
})
