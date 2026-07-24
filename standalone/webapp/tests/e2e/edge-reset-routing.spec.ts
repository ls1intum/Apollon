import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

const __d = path.dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "two-class-fresh-edge.json"),
    "utf-8"
  )
) as Record<string, unknown>

async function persistedPoints(page: Page): Promise<unknown[] | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("persistenceModelStore")
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const id = parsed.state.currentModelId
    return parsed.state.models[id]?.model?.edges?.[0]?.data?.points ?? null
  })
}

test("an auto-routed edge offers nothing to reset", async ({ page }) => {
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)

  const edge = page.locator(".react-flow__edge").first()
  await edge.click({ force: true })
  await expect(edge).toHaveClass(/selected/)

  // Nothing has been bent, so the edge is already where the router wants it.
  await expect(page.getByRole("button", { name: "Reset routing" })).toHaveCount(
    0
  )
})

test("resetting a hand-routed edge hands it back to the router", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)

  const edge = page.locator(".react-flow__edge").first()
  await edge.click({ force: true })
  await expect(edge).toHaveClass(/selected/)

  // Bend it, so it becomes hand-routed.
  const handle = edge.locator(".edge-bend-handle").first()
  await expect(handle).toBeVisible()
  const box = (await handle.boundingBox())!
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx, cy - 60, { steps: 12 })
  await page.mouse.up()

  await expect
    .poll(() => persistedPoints(page), {
      message: "the drag did not persist a manual route",
    })
    .not.toEqual([])

  const reset = page.getByRole("button", { name: "Reset routing" })
  await expect(reset).toBeVisible()
  await reset.click()

  await expect.poll(() => persistedPoints(page)).toEqual([])

  await expect(page.getByRole("button", { name: "Reset routing" })).toHaveCount(
    0
  )
})
