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
  edgeSearchMs: number
  edgeSearchMaxMs: number
  edgeSearchSetupMs: number
  edgeSearchLoopMs: number
  edgeStepPricings: number
  edgeHeuristicEvaluations: number
  edgeHeapPushes: number
  edgeIncumbentBounds: number
  edgeBoundPrunes: number
  edgeMaxCells: number
  routeScorePairs: number
  routeScoreMs: number
  routeScoreRuns: number
  solveMs: number
  solveMaxMs: number
  solveCount: number
  workerSolveCount: number
  workerResponseCount: number
  workerAttemptCount: number
  workerFallbackCount: number
  workerInitialSyncCount: number
  workerSmallSyncCount: number
  workerSerializeMaxMs: number
  workerPostMessageMaxMs: number
  workerRoundTripMaxMs: number
  workerDispatchDelayMaxMs: number
  workerSnapshotAgeMaxMs: number
  workerReleaseExactMaxMs: number
  workerReleaseSettledMaxMs: number
  workerHolisticPreviewCount: number
  workerFirstPreviewMaxMs: number
  workerPreviewGapMaxMs: number
  workerLatestInputRevision: number
  workerLastDispatchedRevision: number
  workerLastAcceptedRevision: number
  previewDecisionHoldCount: number
  previewDecisionConfirmCount: number
  previewDecisionInvalidationCount: number
  edgeRenderCount: number
  routingSolving: number
  routingPreviewCount: number
  diagramEdgeCount: number
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

export const nodeNearestViewportCenter = async (
  editor: Locator,
  viewport: { width: number; height: number }
): Promise<string | null> =>
  editor.locator(".react-flow__node").evaluateAll((elements, size) => {
    let nearest: string | null = null
    let distance = Infinity
    for (const element of elements) {
      const rect = element.getBoundingClientRect()
      const next = Math.hypot(
        rect.x + rect.width / 2 - size.width / 2,
        rect.y + rect.height / 2 - size.height / 2
      )
      if (next < distance) {
        distance = next
        nearest = element.getAttribute("data-id")
      }
    }
    return nearest
  }, viewport)

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
  {
    steps = 12,
    measureFrames = false,
    waitForRouting = true,
  }: {
    steps?: number
    measureFrames?: boolean
    waitForRouting?: boolean
  } = {}
): Promise<number[]> {
  const box = await node.boundingBox()
  if (!box) throw new Error("node has no bounding box")
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  if (measureFrames)
    await page.evaluate(() => {
      const probe = {
        active: true,
        last: performance.now(),
        deltas: [] as number[],
      }
      ;(
        window as unknown as {
          __edgeFrameProbe?: typeof probe
        }
      ).__edgeFrameProbe = probe
      const tick = (now: number) => {
        if (!probe.active) return
        probe.deltas.push(now - probe.last)
        probe.last = now
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  if (measureFrames) {
    // Playwright's built-in `steps` sends the whole burst as quickly as the
    // protocol allows. That can queue a dozen pointer events before Chromium
    // has painted once, so an rAF probe then reports the burst + pointer-up
    // settle as one enormous "frame". Pace measured moves at one input per
    // paint, like a real display/input loop, and stop the interaction probe
    // before pointer-up starts the (deliberately separate) exact Worker solve.
    for (let step = 1; step <= steps; step++) {
      await page.mouse.move(
        startX + (dx * step) / steps,
        startY + (dy * step) / steps
      )
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
      )
    }
  } else {
    await page.mouse.move(startX + dx, startY + dy, { steps })
  }
  const frameDeltas = measureFrames
    ? await page.evaluate(() => {
        const probe = (
          window as unknown as {
            __edgeFrameProbe?: {
              active: boolean
              deltas: number[]
            }
          }
        ).__edgeFrameProbe
        if (!probe) return []
        probe.active = false
        // The first sample spans setup + pointer-down rather than two
        // interaction paints. It is not a frame-time observation.
        return probe.deltas.slice(1)
      })
    : []
  await page.mouse.up()
  if (waitForRouting) {
    await page.waitForFunction(() => {
      const snapshot = (window as PerfWindow).__apollonPerf?.()
      return snapshot !== undefined && snapshot.routingSolving === 0
    })
  }
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  )
  return frameDeltas
}
