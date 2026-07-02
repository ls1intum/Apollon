import { test, expect, type Page } from "@playwright/test"
import { waitForCanvasReady } from "../helpers/canvas"

/**
 * Dropping the first palette element onto an empty canvas must not move the
 * viewport. A fitView issued while empty stays queued and otherwise fires on
 * the first node, re-framing it and jerking the canvas.
 */

async function openTemporaryLocalDiagram(
  page: Page,
  diagramType = "ClassDiagram"
) {
  const modelId = "e2e-first-drop-model-id"
  await page.goto("/")
  await page.evaluate(
    ({ id, type }) => {
      const storeValue = JSON.stringify({
        state: {
          models: {
            [id]: {
              id,
              model: {
                id,
                type,
                assessments: {},
                edges: [],
                nodes: [],
                title: "E2E Diagram",
                version: "4.0.0",
              },
              lastModifiedAt: new Date().toISOString(),
            },
          },
          currentModelId: id,
        },
        version: 0,
      })
      localStorage.setItem("persistenceModelStore", storeValue)
    },
    { id: modelId, type: diagramType }
  )
  await page.goto(`/local/${modelId}`)
  await expect(page).toHaveURL(new RegExp(`/local/${modelId}$`))
}

// Read the .react-flow__viewport transform matrix -> {zoom, x, y}.
async function readViewport(page: Page) {
  return page.evaluate(() => {
    const vp = document.querySelector<HTMLElement>(".react-flow__viewport")
    if (!vp) return null
    const m = new DOMMatrixReadOnly(getComputedStyle(vp).transform)
    return { zoom: m.a, x: m.e, y: m.f }
  })
}

// Drag the first palette element and drop it at the given viewport coordinates.
async function dropFirstPaletteElementAt(page: Page, x: number, y: number) {
  const palette = page.locator('[data-testid="apollon-palette"]').first()
  const preview = palette.locator("[data-draggable-preview]").first()
  await expect(preview).toBeVisible()
  const box = await preview.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(x, y, { steps: 10 })
  await page.mouse.up()
}

test.describe("First palette drop — no canvas jump", () => {
  test.beforeEach(async ({ page }) => {
    await openTemporaryLocalDiagram(page)
    await waitForCanvasReady(page, false)
  })

  test("viewport is unchanged after dropping the first node", async ({
    page,
  }) => {
    const before = await readViewport(page)
    expect(before, "viewport must be readable").not.toBeNull()

    const canvas = page.locator(".react-flow").first()
    const cbox = await canvas.boundingBox()
    expect(cbox).not.toBeNull()

    // Off-centre so a re-framing fit would shift the viewport measurably.
    await dropFirstPaletteElementAt(
      page,
      cbox!.x + cbox!.width * 0.4,
      cbox!.y + cbox!.height * 0.4
    )

    await expect(page.locator(".react-flow__node")).toHaveCount(1)

    const after = await readViewport(page)
    expect(after, "viewport must be readable").not.toBeNull()

    expect(after!.zoom).toBeCloseTo(before!.zoom, 3)
    expect(Math.abs(after!.x - before!.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1)
  })
})
