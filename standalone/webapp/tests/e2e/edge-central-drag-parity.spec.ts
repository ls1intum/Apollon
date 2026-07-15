import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"
import { sampleEdgePath, type Pt } from "../helpers/edgeGeometry"

/**
 * Bend-drag parity between the two routing engines. The static gate proves the
 * two agree at rest; this proves they agree THROUGH a real interaction — the
 * whole central drag path (the live-override publish that lets neighbours dodge
 * the in-progress preview, and the settle after release) must land on the same
 * geometry the per-edge path does. A single fixed gesture is replayed in both
 * modes and every edge's persisted points and rendered path are compared.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
type Model = { id: string; edges: { id: string }[] }
const load = (file: string) =>
  JSON.parse(
    fs.readFileSync(path.join(__d, "..", "fixtures", file), "utf-8")
  ) as Model

const model = load("edge-diag-17.json")

const SAMPLE_PX = 6
const TOL = 0.6

async function persistedPointsById(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("persistenceModelStore")
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const id = parsed.state.currentModelId
    const edges = parsed.state.models[id]?.model?.edges ?? []
    const out: Record<string, { x: number; y: number }[]> = {}
    for (const e of edges) out[e.id] = e.data?.points ?? []
    return out
  })
}

/** Replay one fixed bend gesture on the first edge, then sample the world. */
async function dragAndCapture(page: Page, edgeRouting: "central" | "per-edge") {
  await openFixtureInLocalEditor(
    page,
    model as unknown as Record<string, unknown>,
    { edgeRouting }
  )
  await waitForCanvasReady(page)

  // Select the first edge (click its path away from centre so the click does
  // not itself land on the bend handle), revealing its bend handle.
  const edge = page.locator(".react-flow__edge").first()
  const pathBox = (await edge.locator("path").first().boundingBox())!
  await page.mouse.click(pathBox.x + 10, pathBox.y + pathBox.height / 2)
  await page.waitForTimeout(200)

  const handle = edge.locator(".edge-bend-handle").first()
  await expect(handle).toBeVisible()
  const box = (await handle.boundingBox())!
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  // Grab the handle and drag it a fixed distance, holding mid-drag so the live
  // preview (and, in central mode, the override) is active, then release.
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 40, cy + 40, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(400)

  const rendered = new Map<string, Pt[]>()
  for (const e of model.edges) {
    rendered.set(e.id, await sampleEdgePath(page, e.id, SAMPLE_PX))
  }
  const persisted = await persistedPointsById(page)
  return { rendered, persisted }
}

test("central and per-edge agree after an identical bend drag", async ({
  page,
}) => {
  const perEdge = await dragAndCapture(page, "per-edge")
  const central = await dragAndCapture(page, "central")

  for (const e of model.edges) {
    const short = e.id.slice(0, 8)

    // Persisted waypoints — the source of truth the user inspects — must match.
    expect(
      central.persisted[e.id],
      `edge ${short}: persisted points differ`
    ).toEqual(perEdge.persisted[e.id])

    // Rendered paths must coincide within sub-pixel jitter.
    const a = perEdge.rendered.get(e.id) ?? []
    const b = central.rendered.get(e.id) ?? []
    expect(
      b.length,
      `edge ${short}: central ${b.length} pts vs per-edge ${a.length}`
    ).toBe(a.length)
    for (let i = 0; i < a.length; i++) {
      expect(
        Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y),
        `edge ${short} pt ${i}: per-edge (${a[i].x},${a[i].y}) vs central (${b[i].x},${b[i].y})`
      ).toBeLessThanOrEqual(TOL)
    }
  }
})
