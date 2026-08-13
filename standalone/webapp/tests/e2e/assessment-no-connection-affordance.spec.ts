import { test, expect, type Page } from "@playwright/test"

/**
 * Assessment is a reading/feedback surface. Nothing about connecting nodes
 * belongs in it: no visible handles, no crosshair, and above all nothing that
 * swallows a pointer aimed at the node underneath.
 *
 * The handles stay mounted — edge geometry is measured from them — so this
 * asserts they are inert rather than absent. It exists because
 * `pointer-events: none` on the handle was NOT enough: the arc's `::before`
 * re-arms itself when its node is hovered, and a descendant that opts back in
 * is hit-testable even inside a `none` parent.
 */
async function tapPalette(page: Page) {
  const preview = page
    .locator('[data-testid="apollon-palette"]')
    .first()
    .locator("[data-draggable-preview]")
    .first()
  await expect(preview).toBeVisible()
  const b = await preview.boundingBox()
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2)
  await page.mouse.down()
  await page.mouse.up()
}

async function enterAssessment(page: Page) {
  await page.getByTestId("playground-mode").click()
  await page.getByRole("option", { name: "Assessment (give feedback)" }).click()
  await expect(page.locator(".apollon-editor--assessment")).toHaveCount(1)
}

test.describe("assessment mode has no connection affordance", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/playground")
    await page.waitForSelector('[data-testid="apollon-palette"]', {
      timeout: 30_000,
    })
    await tapPalette(page)
    await expect(page.locator(".react-flow__node")).toHaveCount(1)
    await page.keyboard.press("Escape")
    await enterAssessment(page)
  })

  test("hovering a node leaves its handles inert and invisible", async ({
    page,
  }) => {
    const node = page.locator(".react-flow__node").first()
    const box = await node.boundingBox()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.waitForTimeout(300)

    const handles = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".react-flow__handle")).map((el) => {
        const s = getComputedStyle(el)
        const before = getComputedStyle(el, "::before")
        return {
          pointerEvents: s.pointerEvents,
          cursor: s.cursor,
          background: s.backgroundColor,
          beforePointerEvents: before.pointerEvents,
          beforeBackground: before.backgroundColor,
        }
      })
    )
    expect(handles.length).toBeGreaterThan(0)
    for (const h of handles) {
      expect(h.pointerEvents).toBe("none")
      expect(h.cursor).not.toBe("crosshair")
      expect(h.beforePointerEvents).toBe("none")
      expect(h.beforeBackground).toBe("rgba(0, 0, 0, 0)")
    }
  })

  test("the pointer over a handle's arc reaches the node, not the handle", async ({
    page,
  }) => {
    const node = page.locator(".react-flow__node").first()
    const box = await node.boundingBox()
    // Just inside the top edge, where a top arc handle and its overhanging
    // ::before sit.
    const x = box!.x + box!.width / 2
    const y = box!.y + 2

    await page.mouse.move(x, y)
    await page.waitForTimeout(200)

    const hit = await page.evaluate(
      ([px, py]) => {
        const el = document.elementFromPoint(px as number, py as number)
        return {
          isHandle: !!el?.closest(".react-flow__handle"),
          cursor: el ? getComputedStyle(el).cursor : "none",
        }
      },
      [x, y]
    )
    expect(hit.isHandle).toBe(false)
    expect(hit.cursor).not.toBe("crosshair")
  })

  test("edges keep a forgiving hit ribbon without custom selection styling", async ({
    page,
  }) => {
    const width = await page.evaluate(() => {
      const el = document.querySelector(".apollon-editor--assessment")
      if (!el) return null
      const probe = document.createElement("div")
      probe.className = "edge-overlay"
      el.appendChild(probe)
      const w = getComputedStyle(probe).strokeWidth
      probe.remove()
      return w
    })
    expect(width).toBe("32px")
  })
})
