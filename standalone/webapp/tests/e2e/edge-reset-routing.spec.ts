import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Handing an edge back to the router.
 *
 * Before this, a single bend froze an edge into a fixed polyline for good: it
 * stopped being auto-routed, it never picked up any later routing improvement,
 * and there was no way back. "Reset routing" is the way back — and because
 * stored points ARE the manual state (an auto-routed edge simply has none),
 * resetting is just clearing them. No new field, no migration, nothing to break.
 *
 * The button only appears once there is something to reset, which is also the
 * honest signal that the edge is no longer auto-routed.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "two-class-fresh-edge.json"),
    "utf-8"
  )
) as Record<string, unknown>

/** The first edge's persisted points — the source of truth for auto vs manual. */
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
  await page.waitForTimeout(300)

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
  await page.waitForTimeout(300)

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
  await page.waitForTimeout(400)

  const bent = await persistedPoints(page)
  expect(bent, "the drag did not persist a manual route").not.toEqual([])
  expect((bent ?? []).length).toBeGreaterThan(0)

  // The way back now exists.
  await edge.click({ force: true })
  await page.waitForTimeout(300)
  const reset = page.getByRole("button", { name: "Reset routing" })
  await expect(reset).toBeVisible()
  await reset.click()
  await page.waitForTimeout(500)

  // Back to auto: no stored points at all, which is exactly what "auto" means.
  expect(await persistedPoints(page)).toEqual([])

  // And the affordance is gone again, because there is nothing left to reset.
  await expect(page.getByRole("button", { name: "Reset routing" })).toHaveCount(
    0
  )
})
