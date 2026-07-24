import { test, expect, type Page } from "@playwright/test"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

/**
 * Every shortcut and gesture the "How to use this editor?" sheet advertises,
 * proven end to end so the sheet can't lie. Undo/redo, Delete and the arrow
 * keys are React Flow's; the rest run through `APOLLON_SHORTCUTS`. The version
 * shortcuts (Ctrl/Cmd+Shift+S, Alt+Shift+H) live in local-version-history.spec.
 *
 * Two fixtures: COMPACT fits at 100% so its nodes are full-size and clickable;
 * SPREAD overflows the viewport so a real zoom-to-fit reads below 100% (on a
 * fitting diagram it would be indistinguishable from reset-zoom).
 */

const cls = (id: string, name: string, x: number, y: number) => ({
  id,
  type: "class",
  width: 200,
  height: 110,
  position: { x, y },
  measured: { width: 200, height: 110 },
  data: {
    name,
    attributes: [{ id: `${id}-a`, name: "x: int" }],
    methods: [{ id: `${id}-m`, name: "foo()" }],
  },
})

const COMPACT = {
  id: "e2e-shortcuts-compact",
  version: "4.0.0",
  title: "Shortcuts",
  type: "ClassDiagram",
  nodes: [cls("node-a", "Alpha", 0, 0), cls("node-b", "Beta", 300, 0)],
  edges: [
    {
      id: "edge-1",
      type: "class",
      source: "node-a",
      target: "node-b",
      data: {},
    },
  ],
  assessments: {},
}

const SPREAD = {
  ...COMPACT,
  id: "e2e-shortcuts-spread",
  nodes: [cls("node-a", "Alpha", 0, 0), cls("node-b", "Beta", 1600, 950)],
  edges: [],
}

const nodes = (page: Page) => page.locator(".react-flow__node")
const selectedNodes = (page: Page) => page.locator(".react-flow__node.selected")
const edges = (page: Page) => page.locator(".react-flow__edge")
const node = (page: Page, name: string) =>
  page.locator(".react-flow__node", { hasText: name })
const zoomReadout = (page: Page) =>
  page.locator(".apollon-chrome-iconbtn--readout")
const viewport = (page: Page) => page.locator(".react-flow__viewport")

const openWith = async (page: Page, fixture: Record<string, unknown>) => {
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)
}

/** Center of a node in screen coordinates. */
const nodeCenter = async (page: Page, name: string) => {
  const box = (await node(page, name).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** The viewport transform once it stops changing (fit/zoom animate). */
const settledTransform = async (page: Page) => {
  let last = ""
  await expect
    .poll(async () => {
      const now = (await viewport(page).getAttribute("style")) ?? ""
      const stable = now === last
      last = now
      return stable
    })
    .toBe(true)
  return last
}

// Copy/paste go through navigator.clipboard, which needs permission + a secure
// context; localhost qualifies as secure.
test.use({ permissions: ["clipboard-read", "clipboard-write"] })

test.describe("Selection", () => {
  test("Ctrl+A selects everything, Escape clears", async ({ page }) => {
    await openWith(page, COMPACT)
    await page.keyboard.press("ControlOrMeta+KeyA")
    await expect(selectedNodes(page)).toHaveCount(2)
    await page.keyboard.press("Escape")
    await expect(selectedNodes(page)).toHaveCount(0)
  })

  test("Shift+Click adds an element, then removes it", async ({ page }) => {
    await openWith(page, COMPACT)
    await node(page, "Alpha").click()
    await expect(selectedNodes(page)).toHaveCount(1)

    await node(page, "Beta").click({ modifiers: ["Shift"] })
    await expect(selectedNodes(page)).toHaveCount(2)

    await node(page, "Beta").click({ modifiers: ["Shift"] })
    await expect(selectedNodes(page)).toHaveCount(1)
    await expect(node(page, "Alpha")).toHaveClass(/selected/)
  })

  test("Shift+Drag box-selects an area", async ({ page }) => {
    await openWith(page, COMPACT)
    const a = (await node(page, "Alpha").boundingBox())!
    const b = (await node(page, "Beta").boundingBox())!

    await page.keyboard.down("Shift")
    await page.mouse.move(Math.min(a.x, b.x) - 25, Math.min(a.y, b.y) - 25)
    await page.mouse.down()
    await page.mouse.move(
      Math.max(a.x + a.width, b.x + b.width) + 25,
      Math.max(a.y + a.height, b.y + b.height) + 25,
      { steps: 8 }
    )
    await page.mouse.up()
    await page.keyboard.up("Shift")

    await expect(selectedNodes(page)).toHaveCount(2)
  })
})

test.describe("Editing", () => {
  test("Delete removes the selection", async ({ page }) => {
    await openWith(page, COMPACT)
    await node(page, "Alpha").click()
    await expect(selectedNodes(page)).toHaveCount(1)

    await page.keyboard.press("Delete")
    await expect(nodes(page)).toHaveCount(1)
    await expect(node(page, "Alpha")).toHaveCount(0)
  })

  test("Ctrl+C then Ctrl+V pastes a copy", async ({ page }) => {
    await openWith(page, COMPACT)
    await node(page, "Alpha").click()
    await expect(selectedNodes(page)).toHaveCount(1)

    await page.keyboard.press("ControlOrMeta+KeyC")
    await page.keyboard.press("ControlOrMeta+KeyV")

    await expect(nodes(page)).toHaveCount(3)
    // The paste lands selected so it can be moved straight away.
    await expect(selectedNodes(page)).toHaveCount(1)
  })

  test("two rapid pastes cascade instead of overwriting each other", async ({
    page,
  }) => {
    await openWith(page, COMPACT)
    await node(page, "Alpha").click()
    await page.keyboard.press("ControlOrMeta+KeyC")

    // Two distinct presses (not a held-key repeat): the second fires while the
    // first's async clipboard read is still in flight. Each must build on the
    // previous — 2 copies, not 1 overwriting the other.
    await page.keyboard.press("ControlOrMeta+KeyV")
    await page.keyboard.press("ControlOrMeta+KeyV")

    await expect(nodes(page)).toHaveCount(4)
  })

  test("Ctrl+X cuts, Ctrl+V pastes it back", async ({ page }) => {
    await openWith(page, COMPACT)
    await node(page, "Alpha").click()

    await page.keyboard.press("ControlOrMeta+KeyX")
    await expect(nodes(page)).toHaveCount(1)

    await page.keyboard.press("ControlOrMeta+KeyV")
    await expect(nodes(page)).toHaveCount(2)
  })

  test("Ctrl+D duplicates the selection with its edges", async ({ page }) => {
    await openWith(page, COMPACT)
    await page.keyboard.press("ControlOrMeta+KeyA")
    await expect(selectedNodes(page)).toHaveCount(2)

    await page.keyboard.press("ControlOrMeta+KeyD")
    await expect(nodes(page)).toHaveCount(4)
    // The association between the two classes is carried onto the copies.
    await expect(edges(page)).toHaveCount(2)
    await expect(selectedNodes(page)).toHaveCount(2)
  })

  test("arrow keys nudge the selection", async ({ page }) => {
    await openWith(page, COMPACT)
    await node(page, "Alpha").click()
    const before = await nodeCenter(page, "Alpha")

    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")

    const after = await nodeCenter(page, "Alpha")
    expect(after.x).toBeGreaterThan(before.x)
  })
})

test.describe("History", () => {
  test("Ctrl+Z undoes, Ctrl+Shift+Z redoes", async ({ page }) => {
    await openWith(page, COMPACT)
    await node(page, "Alpha").click()
    await page.keyboard.press("Delete")
    await expect(nodes(page)).toHaveCount(1)

    await page.keyboard.press("ControlOrMeta+KeyZ")
    await expect(nodes(page)).toHaveCount(2)

    await page.keyboard.press("ControlOrMeta+Shift+KeyZ")
    await expect(nodes(page)).toHaveCount(1)
  })
})

test.describe("View", () => {
  test("zoom in / out / reset", async ({ page }) => {
    await openWith(page, COMPACT)
    await expect(zoomReadout(page)).toHaveText("100%")

    // React Flow steps zoom by 1/1.2, so one step lands on 83%.
    await page.keyboard.press("ControlOrMeta+Minus")
    await expect(zoomReadout(page)).toHaveText("83%")

    await page.keyboard.press("ControlOrMeta+Equal")
    await expect(zoomReadout(page)).toHaveText("100%")

    await page.keyboard.press("ControlOrMeta+Minus")
    await page.keyboard.press("ControlOrMeta+Digit0")
    await expect(zoomReadout(page)).toHaveText("100%")
  })

  test("zoom to fit frames the whole diagram", async ({ page }) => {
    await openFixtureInLocalEditor(page, SPREAD)
    // At the initial 100% camera both far-apart nodes can legitimately be
    // outside the viewport and therefore culled from the DOM. The fit shortcut
    // is what must bring them into view, so canvas readiness cannot require a
    // rendered node before the shortcut runs.
    await waitForCanvasReady(page, false)
    // SPREAD overflows at 100%, so a real fit reads below it — a fit that fell
    // through to reset-zoom would stay at 100%.
    await page.keyboard.press("ControlOrMeta+Shift+Digit1")
    await expect(nodes(page).first()).toBeVisible()
    await expect(zoomReadout(page)).not.toHaveText("100%")
  })

  test("zoom to selection frames just the selection", async ({ page }) => {
    // Framing Alpha and framing Beta must land on different viewports —
    // proving the shortcut reframes on the SELECTION, not the whole diagram.
    await openWith(page, COMPACT)

    await node(page, "Alpha").click()
    await page.keyboard.press("ControlOrMeta+Shift+Digit2")
    const framedAlpha = await settledTransform(page)

    await node(page, "Beta").click()
    await page.keyboard.press("ControlOrMeta+Shift+Digit2")
    const framedBeta = await settledTransform(page)

    expect(framedBeta).not.toBe(framedAlpha)
  })

  test("dragging the pane pans the canvas", async ({ page }) => {
    await openWith(page, COMPACT)
    const before = await viewport(page).getAttribute("style")

    // A left-drag on empty canvas pans (panOnDrag). Start clear of the nodes.
    await page.mouse.move(600, 500)
    await page.mouse.down()
    await page.mouse.move(750, 620, { steps: 8 })
    await page.mouse.up()

    await expect
      .poll(() => viewport(page).getAttribute("style"))
      .not.toBe(before)
  })

  test("plain scroll pans, Ctrl/Cmd+scroll zooms", async ({ page }) => {
    await openWith(page, COMPACT)
    await page.mouse.move(640, 400)

    // Plain wheel pans (panOnScroll) — the readout stays put, the viewport moves.
    const before = await viewport(page).getAttribute("style")
    await page.mouse.wheel(0, 300)
    await expect(zoomReadout(page)).toHaveText("100%")
    await expect
      .poll(() => viewport(page).getAttribute("style"))
      .not.toBe(before)

    // Holding Ctrl/Cmd turns the wheel into zoom.
    await page.keyboard.down("Control")
    await page.mouse.wheel(0, -300)
    await page.keyboard.up("Control")
    await expect(zoomReadout(page)).not.toHaveText("100%")
  })
})

test.describe("File", () => {
  test("Ctrl+S downloads the diagram as JSON", async ({ page }) => {
    await openWith(page, COMPACT)
    const download = page.waitForEvent("download")
    await page.keyboard.press("ControlOrMeta+KeyS")
    expect((await download).suggestedFilename()).toMatch(/\.json$/)
  })
})

test.describe("Guards", () => {
  test("shortcuts stay out of a text field", async ({ page }) => {
    await openWith(page, COMPACT)
    // Type into the diagram-title field, then press the select-all combo: the
    // field must keep it, so the canvas is NOT select-all'd. This is the sheet's
    // "ignored while editing text in a field" promise.
    await page.getByLabel("Diagram title").click()
    await page.keyboard.press("ControlOrMeta+KeyA")
    await expect(selectedNodes(page)).toHaveCount(0)
  })
})
