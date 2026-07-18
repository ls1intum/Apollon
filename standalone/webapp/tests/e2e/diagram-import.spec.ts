import { test, expect, type Page } from "@playwright/test"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

/**
 * Drag-and-drop diagram import. Playwright can't drop OS files, so we synthesize
 * the drop the browser way: build a `DataTransfer` with a `File` in the page and
 * dispatch dragenter/dragover/drop on an element inside the dropzone, which
 * bubbles to React's handler exactly as a real drop would.
 */

const DROPPED_ID = "e2e-dropped-00000000-0000-4000-8000-000000000001"

const diagramJson = (id: string, title: string) =>
  JSON.stringify({
    version: "4.0.0",
    id,
    title,
    type: "ClassDiagram",
    nodes: [],
    edges: [],
    assessments: {},
  })

/**
 * Drop a file onto the first element matching `selector`. Returns whether the
 * app cancelled the drag events — if it doesn't, the browser navigates to the
 * dropped file instead of importing it, which is the bug this guards.
 */
async function dropFile(
  page: Page,
  selector: string,
  fileName: string,
  contents: string,
  type: string
) {
  await page.locator(selector).first().waitFor({ state: "attached" })
  return page.evaluate(
    ({ selector, fileName, contents, type }) => {
      const dt = new DataTransfer()
      dt.items.add(new File([contents], fileName, { type }))
      const target = document.querySelector(selector)!
      const init = { bubbles: true, cancelable: true, dataTransfer: dt }
      target.dispatchEvent(new DragEvent("dragenter", init))
      const over = new DragEvent("dragover", init)
      target.dispatchEvent(over)
      const drop = new DragEvent("drop", init)
      target.dispatchEvent(drop)
      return {
        overPrevented: over.defaultPrevented,
        dropPrevented: drop.defaultPrevented,
      }
    },
    { selector, fileName, contents, type }
  )
}

test.describe("Drag-and-drop import", () => {
  test("dropping a .json on the home page opens it as a new diagram", async ({
    page,
  }) => {
    await page.goto("/")

    const prevented = await dropFile(
      page,
      ".home-canvas-bg",
      "dropped.json",
      diagramJson(DROPPED_ID, "Dropped Diagram"),
      "application/json"
    )

    // Both cancelled — otherwise the browser opens the raw JSON.
    expect(prevented).toEqual({ overPrevented: true, dropPrevented: true })

    // Imported as a new local diagram, and opened.
    await expect(page).toHaveURL(new RegExp(`/local/${DROPPED_ID}$`))
    await page.locator(".react-flow").first().waitFor({ state: "visible" })
  })

  test("dropping a .json onto an open editor opens the imported diagram", async ({
    page,
  }) => {
    await openFixtureInLocalEditor(page, {
      id: "e2e-import-host",
      version: "4.0.0",
      title: "Host",
      type: "ClassDiagram",
      nodes: [],
      edges: [],
      assessments: {},
    })
    await waitForCanvasReady(page, false)

    await dropFile(
      page,
      ".react-flow",
      "dropped.json",
      diagramJson(DROPPED_ID, "Dropped Diagram"),
      "application/json"
    )

    await expect(page).toHaveURL(new RegExp(`/local/${DROPPED_ID}$`))
  })

  test("a drop anywhere in the window imports — even outside page content", async ({
    page,
  }) => {
    // The whole window is the drop surface: a wrapper around page content
    // leaves gaps (margins, rails, portaled dialogs) where the browser would
    // open the file instead.
    await page.goto("/")
    // Wait for the app to mount — the window listeners come up with it.
    await page.locator(".home-canvas-bg").first().waitFor({ state: "visible" })

    const prevented = await dropFile(
      page,
      "body",
      "dropped.json",
      diagramJson(DROPPED_ID, "Dropped Diagram"),
      "application/json"
    )

    expect(prevented).toEqual({ overPrevented: true, dropPrevented: true })
    await expect(page).toHaveURL(new RegExp(`/local/${DROPPED_ID}$`))
  })

  test("dropping a non-diagram file is rejected without navigating", async ({
    page,
  }) => {
    await page.goto("/")

    await dropFile(
      page,
      ".home-canvas-bg",
      "notes.txt",
      "just text",
      "text/plain"
    )

    await expect(
      page.getByText(/Drop a \.json diagram exported from Apollon/i)
    ).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
  })
})
