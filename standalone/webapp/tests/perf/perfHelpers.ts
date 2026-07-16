import type { Page, Locator } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import {
  injectFixtureIntoLocalStorage,
  waitForCanvasReady,
} from "../helpers/canvas"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export type PerfSnapshot = {
  encodedDocBytes: number
  nodesMapSize: number
  storeNodeWrites: number
  edgeSearches: number
  edgeSearchExpansions: number
  edgeSearchesMaxExpansions: number
  edgeSearchesAbandoned: number
  solveMs: number
  solveMaxMs: number
  solveCount: number
}

export function loadFixture(name: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "fixtures", name), "utf-8")
  ) as Record<string, unknown>
}

/**
 * Open a fixture in the single-user local editor with the perf probe enabled.
 * `?perfHooks=1` is the opt-in gate that exposes `window.__apollonPerf` (see
 * `installPerfHooks`); without it the global is absent and these specs fail
 * loudly rather than silently passing.
 */
export async function openLocalWithPerf(
  page: Page,
  fixture: Record<string, unknown>
): Promise<void> {
  await injectFixtureIntoLocalStorage(page, fixture)
  await page.goto(`/local/${fixture.id as string}?perfHooks=1`)
  await waitForCanvasReady(page)
  await page.waitForFunction(() =>
    Boolean((window as PerfWindow).__apollonPerf)
  )
}

type PerfWindow = Window & { __apollonPerf?: () => PerfSnapshot | undefined }

export async function readPerf(page: Page): Promise<PerfSnapshot> {
  return page.evaluate(() => {
    const probe = (window as PerfWindow).__apollonPerf
    if (!probe) throw new Error("window.__apollonPerf is not installed")
    const snapshot = probe()
    if (!snapshot) throw new Error("__apollonPerf() returned undefined")
    return snapshot
  })
}

/**
 * Drag a node by (dx, dy) screen pixels in `steps` intermediate moves, then
 * release. The intermediate moves mimic React-Flow's per-frame position
 * changes during a real pointer drag — the workload the write guard must keep
 * out of the Yjs document.
 */
export async function dragNodeBy(
  node: Locator,
  page: Page,
  dx: number,
  dy: number,
  steps = 12
): Promise<void> {
  const box = await node.boundingBox()
  if (!box) throw new Error("node has no bounding box")
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + dx, startY + dy, { steps })
  await page.mouse.up()
  // The settle commit lands on a later rAF tick. A per-gesture probe poll can't
  // stand in for the wait: this spec alternates drag direction to keep nodes
  // on-screen, so a node returning to a prior position is a deepEqual no-op that
  // writes nothing — a poll for "writes advanced" would hang on those frames.
  // The aggregate write-rate budget in the spec is the real guard; here a short
  // fixed settle is the pragmatic choice (perf project is serial, retries:0).
  await page.waitForTimeout(120)
}
