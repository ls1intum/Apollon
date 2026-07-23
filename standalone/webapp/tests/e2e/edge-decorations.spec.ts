import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Edge decorations (the floating edit/delete toolbar and per-type annotations
 * such as the SFC transition bar + condition label) are positioned from the
 * edge geometry. While a bend handle is dragged the geometry must update live,
 * so the decorations follow the drag in real time instead of jumping only when
 * the pointer is released. The SFC transition bar must also sit ON the edge
 * centre, not nudged off to the side.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
const readFixture = (name: string) =>
  JSON.parse(
    fs.readFileSync(path.join(__d, "..", "fixtures", name), "utf-8")
  ) as Record<string, unknown>

/** Select an edge by clicking a point ON its path (React Flow ignores clicks in
 * the bounding-box gaps of an L-shaped edge). */
async function selectEdgeById(page: Page, id: string): Promise<void> {
  const pt = await page.evaluate((edgeId) => {
    const g = document.querySelector(`.react-flow__edge[data-id="${edgeId}"]`)
    const p = g?.querySelector(
      "path.react-flow__edge-path"
    ) as SVGPathElement | null
    const ctm = p?.getScreenCTM()
    if (!p || !ctm) return null
    const at = p.getPointAtLength(p.getTotalLength() * 0.2)
    const s = new DOMPoint(at.x, at.y).matrixTransform(ctm)
    return { x: s.x, y: s.y }
  }, id)
  if (!pt) throw new Error(`edge ${id} path not found`)
  await page.mouse.click(pt.x, pt.y)
  await expect(page.locator(`.react-flow__edge[data-id="${id}"]`)).toHaveClass(
    /selected/
  )
}

/** The framework toolbar's on-screen centre. */
async function toolbarXY(page: Page, id: string) {
  return page.evaluate((edgeId) => {
    const toolbar = document.querySelector<HTMLElement>(
      `.react-flow__edge-toolbar[data-id="${edgeId}"]`
    )
    if (!toolbar) return null
    const rect = toolbar.getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
  }, id)
}

/** The toolbar box's on-screen size (px). */
async function toolbarBoxSize(page: Page, id: string) {
  return page.evaluate((edgeId) => {
    const box = document.querySelector<HTMLElement>(
      `.react-flow__edge-toolbar[data-id="${edgeId}"]`
    )
    if (!box) return null
    const r = box.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height) }
  }, id)
}

/** The visible (screen) centre of the edge's only bend handle. */
async function bendHandleScreen(page: Page, id: string) {
  return page.evaluate((edgeId) => {
    const r = document
      .querySelector(`.react-flow__edge[data-id="${edgeId}"]`)
      ?.querySelector("rect.edge-bend-handle") as SVGRectElement | null
    if (!r) return null
    const b = r.getBoundingClientRect()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  }, id)
}

/** SFC transition-bar midpoint and the edge path's geometric middle, both in
 * the edge's own SVG user space (directly comparable). */
async function sfcBarVsMiddle(page: Page, id: string) {
  return page.evaluate((edgeId) => {
    const g = document.querySelector(`.react-flow__edge[data-id="${edgeId}"]`)
    const line = g?.querySelector("line") as SVGLineElement | null
    const p = g?.querySelector(
      "path.react-flow__edge-path"
    ) as SVGPathElement | null
    if (!line || !p) return null
    const mid = p.getPointAtLength(p.getTotalLength() / 2)
    const bar = {
      x: (line.x1.baseVal.value + line.x2.baseVal.value) / 2,
      y: (line.y1.baseVal.value + line.y2.baseVal.value) / 2,
    }
    return { bar, mid: { x: mid.x, y: mid.y } }
  }, id)
}

test("the edit toolbar follows the bend handle live during the drag, not only on release", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, readFixture("two-class-fresh-edge.json"))
  await waitForCanvasReady(page)

  const id = "231f7ef5-b43d-4187-8996-f7726ed6e919"
  await selectEdgeById(page, id)

  const before = await toolbarXY(page, id)
  const handle = await bendHandleScreen(page, id)
  expect(before, "toolbar must render for the selected edge").not.toBeNull()
  expect(handle, "edge must offer a bend handle").not.toBeNull()

  await page.mouse.move(handle!.x, handle!.y)
  await page.mouse.down()
  await page.mouse.move(handle!.x, handle!.y + 90, { steps: 10 })
  const mid = await toolbarXY(page, id)
  await page.mouse.up()
  const after = await toolbarXY(page, id)

  // It actually moved as a result of the drag...
  expect(
    Math.abs(after!.y - before!.y),
    "the toolbar should end up at the new edge middle"
  ).toBeGreaterThan(20)
  // ...and it had already reached (≈) that position mid-drag, rather than
  // staying frozen at the start until release.
  expect(
    Math.abs(mid!.y - after!.y),
    "the toolbar must track the drag live (was frozen until release)"
  ).toBeLessThanOrEqual(8)
})

test("the edit toolbar keeps a constant on-screen size across zoom (does not scale with the edge)", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, readFixture("two-class-fresh-edge.json"))
  await waitForCanvasReady(page)

  const id = "231f7ef5-b43d-4187-8996-f7726ed6e919"
  await selectEdgeById(page, id)

  const atDefault = await toolbarBoxSize(page, id)
  const handleAtDefault = await bendHandleScreen(page, id)
  expect(atDefault, "toolbar must render for the selected edge").not.toBeNull()

  // The toolbar must not cover the centre bend handle: the topmost element at
  // the handle centre is the handle itself, not a toolbar button.
  if (handleAtDefault) {
    const top = await page.evaluate(
      ({ x, y }) =>
        document.elementFromPoint(x, y)?.getAttribute("class") ?? "",
      handleAtDefault
    )
    expect(top, "the toolbar must not obstruct the bend handle").toContain(
      "edge-bend-handle"
    )
  }

  const zoomIn = page.getByRole("button", { name: "Zoom in" })
  for (let i = 0; i < 5; i++) {
    if (!(await zoomIn.isEnabled())) break
    await zoomIn.click()
  }
  const zoomedIn = await toolbarBoxSize(page, id)

  // Constant on-screen size: before the fix this ballooned (~32 -> ~80px).
  expect(
    Math.abs(zoomedIn!.w - atDefault!.w),
    `toolbar width changed with zoom (${atDefault!.w} -> ${zoomedIn!.w})`
  ).toBeLessThanOrEqual(4)
  expect(
    Math.abs(zoomedIn!.h - atDefault!.h),
    `toolbar height changed with zoom (${atDefault!.h} -> ${zoomedIn!.h})`
  ).toBeLessThanOrEqual(4)
})

test("the SFC transition bar sits on the edge centre, not off to the side", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, readFixture("sfc-condition-edge.json"))
  await waitForCanvasReady(page)

  await selectEdgeById(page, "sfcCondEdge")

  const m = await sfcBarVsMiddle(page, "sfcCondEdge")
  expect(m, "SFC bar and edge path must be present").not.toBeNull()
  expect(
    Math.abs(m!.bar.x - m!.mid.x),
    `bar x ${m!.bar.x} should sit on the edge middle x ${m!.mid.x}`
  ).toBeLessThanOrEqual(6)
  expect(
    Math.abs(m!.bar.y - m!.mid.y),
    `bar y ${m!.bar.y} should sit on the edge middle y ${m!.mid.y}`
  ).toBeLessThanOrEqual(6)
})

/** The relationship middle-label position and the edge path's geometric middle,
 * both in the edge's own SVG user space (directly comparable, flow units). */
async function labelVsMiddle(page: Page, id: string, text: string) {
  return page.evaluate(
    ({ edgeId, needle }) => {
      const g = document.querySelector(`.react-flow__edge[data-id="${edgeId}"]`)
      const label = Array.from(g?.querySelectorAll("text") ?? []).find((t) =>
        (t.textContent ?? "").includes(needle)
      )
      const p = g?.querySelector(
        "path.react-flow__edge-path"
      ) as SVGPathElement | null
      if (!label || !p) return null
      const mid = p.getPointAtLength(p.getTotalLength() / 2)
      const near = p.getPointAtLength(
        Math.min(p.getTotalLength() / 2 + 2, p.getTotalLength())
      )
      return {
        mid: { x: mid.x, y: mid.y },
        isHorizontal: Math.abs(near.x - mid.x) > Math.abs(near.y - mid.y),
        label: {
          x: Number(label.getAttribute("x")),
          y: Number(label.getAttribute("y")),
          anchor: label.getAttribute("text-anchor"),
          baseline: label.getAttribute("dominant-baseline"),
        },
      }
    },
    { edgeId: id, needle: text }
  )
}

test("the relationship label sits centered on top of a horizontal mid-segment, off the line", async ({
  page,
}) => {
  await openFixtureInLocalEditor(
    page,
    readFixture("deployment-labeled-edge.json")
  )
  await waitForCanvasReady(page)

  const m = await labelVsMiddle(page, "labeled-assoc", "deploys")
  expect(m, "labeled edge and its middle label must be present").not.toBeNull()
  expect(m!.isHorizontal, "the mid-segment should be horizontal").toBe(true)

  // Centered over the mid-segment (x), not nudged off to the side.
  expect(
    Math.abs(m!.label.x - m!.mid.x),
    `label x ${m!.label.x} should be centered on the mid x ${m!.mid.x}`
  ).toBeLessThanOrEqual(2)
  expect(m!.label.anchor).toBe("middle")

  // ON TOP: above the line, by roughly the constant gap, never on the line.
  const gap = m!.mid.y - m!.label.y
  expect(gap, `label should sit above the line (gap ${gap})`).toBeGreaterThan(6)
  expect(
    gap,
    `label gap ${gap} should be the constant on-top offset`
  ).toBeLessThan(24)
  expect(m!.label.baseline).toBe("auto")
})

test("the SFC transition bar follows the bend handle live during the drag", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, readFixture("sfc-condition-edge.json"))
  await waitForCanvasReady(page)

  await selectEdgeById(page, "sfcCondEdge")

  const before = await sfcBarVsMiddle(page, "sfcCondEdge")
  const handle = await bendHandleScreen(page, "sfcCondEdge")
  expect(handle, "SFC edge must offer a bend handle").not.toBeNull()

  await page.mouse.move(handle!.x, handle!.y)
  await page.mouse.down()
  await page.mouse.move(handle!.x + 70, handle!.y, { steps: 10 })
  const mid = await sfcBarVsMiddle(page, "sfcCondEdge")
  await page.mouse.up()
  await page.waitForTimeout(150)

  expect(
    Math.abs(mid!.bar.x - before!.bar.x),
    "the transition bar must move with the edge while dragging"
  ).toBeGreaterThan(20)
  // The bar must still sit on the (now moved) path middle mid-drag.
  expect(
    Math.abs(mid!.bar.x - mid!.mid.x),
    "the transition bar must stay centred on the live path"
  ).toBeLessThanOrEqual(8)
})
