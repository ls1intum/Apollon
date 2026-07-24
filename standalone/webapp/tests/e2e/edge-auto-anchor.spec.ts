import { test, expect, type Locator, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

/**
 * Auto endpoint anchoring — the DEFAULT behaviour, as opposed to a user-pinned
 * (custom) anchor (which `edge-freeform-anchor.spec.ts` covers).
 *
 * By default an edge is not pinned to a fixed handle: the solver slides and
 * switches its endpoint anchors every frame to route as cleanly as it can, and
 * — crucially — persists nothing. The anchor is derived from the current
 * geometry alone, so two collaborators with different drag histories, and a
 * reload, all render the same edge. Only a manual endpoint drag turns an end
 * "custom" and writes a `{side, ratio}` to the model.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
const offsetFixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "two-class-offset-edge.json"),
    "utf-8"
  )
) as Record<string, unknown>

const SOURCE = "95aac2b6-3e6b-4e6d-9201-52a498e6ea20"
const TARGET = "32659cdc-bd03-46f3-918c-ee8dbba9c15b"
const EDGE = "231f7ef5-b43d-4187-8996-f7726ed6e919"

function edgeById(page: Page, id: string): Locator {
  return page.locator(`.react-flow__edge[data-id="${id}"]`)
}

/** The main routed polyline's `d`, or null before it lays out. */
function pathD(page: Page, id: string): Promise<string | null> {
  return edgeById(page, id)
    .locator(".react-flow__edge-path")
    .first()
    .getAttribute("d")
}

/** The polyline's corner points, parsed from the M/L commands of an SVG path.
 * Bridge arcs (Q, from line jumps) are collapsed to their endpoint so a jump on
 * an otherwise straight run does not read as a bend. */
function cornersOf(d: string | null): { x: number; y: number }[] {
  if (!d) return []
  const pts: { x: number; y: number }[] = []
  const re =
    /([ML])\s*(-?[\d.]+)[ ,]+(-?[\d.]+)|Q\s*-?[\d.]+[ ,]+-?[\d.]+[ ,]+(-?[\d.]+)[ ,]+(-?[\d.]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(d)) !== null) {
    const x = m[2] !== undefined ? Number(m[2]) : Number(m[4])
    const y = m[3] !== undefined ? Number(m[3]) : Number(m[5])
    pts.push({ x, y })
  }
  // Drop points that are collinear with their neighbours, so only true corners
  // remain (grid rounding can leave a sub-pixel dogleg on a "straight" run).
  const corners: { x: number; y: number }[] = []
  for (let i = 0; i < pts.length; i++) {
    const prev = corners[corners.length - 1]
    const next = pts[i + 1]
    if (!prev || !next) {
      corners.push(pts[i])
      continue
    }
    const turns =
      Math.sign(Math.round(pts[i].x - prev.x)) !==
        Math.sign(Math.round(next.x - pts[i].x)) ||
      Math.sign(Math.round(pts[i].y - prev.y)) !==
        Math.sign(Math.round(next.y - pts[i].y))
    if (turns) corners.push(pts[i])
  }
  return corners
}

/** How many interior bends the routed edge has (0 = a straight line). */
async function bendCount(page: Page, id: string): Promise<number> {
  return Math.max(0, cornersOf(await pathD(page, id)).length - 2)
}

/** The persisted anchors of the edge, from the model — auto edges have neither. */
async function storedAnchors(page: Page, edgeId: string) {
  return page.evaluate((id) => {
    const raw = localStorage.getItem("persistenceModelStore")
    if (!raw) return null
    const p = JSON.parse(raw)
    const model = p.state.models[p.state.currentModelId]?.model
    const edge = (model?.edges || []).find((e: { id: string }) => e.id === id)
    return {
      sourceAnchor: edge?.data?.sourceAnchor ?? null,
      targetAnchor: edge?.data?.targetAnchor ?? null,
    }
  }, edgeId)
}

async function dragNodeBy(page: Page, nodeId: string, dx: number, dy: number) {
  const node = page.locator(`.react-flow__node[data-id="${nodeId}"]`)
  const box = await node.boundingBox()
  if (!box) throw new Error("node has no bounding box")
  const x = box.x + box.width / 2
  const y = box.y + Math.min(box.height * 0.2, 8)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 12 })
  await page.mouse.up()
}

test("an auto edge routes straight between offset nodes and persists no anchor", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, offsetFixture)
  await waitForCanvasReady(page)

  // The nodes overlap in y but are not centre-aligned; the auto anchors slide
  // onto one line so the edge is straight rather than a Z.
  await expect.poll(() => bendCount(page, EDGE)).toBe(0)

  // Nothing was pinned — the clean route is derived, not stored.
  expect(await storedAnchors(page, EDGE)).toEqual({
    sourceAnchor: null,
    targetAnchor: null,
  })
})

test("an auto edge re-optimises when a node moves, still persisting nothing", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, offsetFixture)
  await waitForCanvasReady(page)
  await expect.poll(() => bendCount(page, EDGE)).toBe(0)

  // Drag the target up so the two nodes become vertically aligned; the edge must
  // stay straight (the anchors re-optimise every frame) and remain auto.
  await dragNodeBy(page, TARGET, 0, -70)

  await expect.poll(() => bendCount(page, EDGE)).toBe(0)
  expect(await storedAnchors(page, EDGE)).toEqual({
    sourceAnchor: null,
    targetAnchor: null,
  })
})

test("the drag preview of an auto edge equals the committed route", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, offsetFixture)
  await waitForCanvasReady(page)
  await expect.poll(() => bendCount(page, EDGE)).toBe(0)

  // Drag the source node and stop WITHOUT releasing, so the path on screen is the
  // live preview. Move in whole grid steps so the held position is exactly where
  // the release will commit it.
  const node = page.locator(`.react-flow__node[data-id="${SOURCE}"]`)
  const box = await node.boundingBox()
  if (!box) throw new Error("source node has no bounding box")
  const x = box.x + box.width / 2
  const y = box.y + 8
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 40, y - 30, { steps: 12 })

  // Wait for the preview to settle: the same `d` read twice in a row. (The solve
  // is synchronous per frame, so this converges immediately.)
  let preview: string | null = null
  await expect
    .poll(async () => {
      const now = await pathD(page, EDGE)
      const stable = now !== null && now === preview
      preview = now
      return stable
    })
    .toBe(true)

  // Release: the committed route must be byte-for-byte the previewed one — the
  // same solve produces both, so a drag can never "settle" into a different edge.
  await page.mouse.up()
  await expect.poll(() => pathD(page, EDGE)).toBe(preview)
})
