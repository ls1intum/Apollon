import { test, expect, type Page } from "@playwright/test"
import { loadFixture, readPerf } from "./perfHelpers"
import {
  injectFixtureIntoLocalStorage,
  waitForCanvasReady,
} from "../helpers/canvas"

// Mirrors `playgroundModelId` in src/constants/playgroundDefaultDiagram.ts;
// inlined to keep this spec off the `src` → library-`dist` resolution path.
const playgroundModelId = "playgroundModelId"

/**
 * Gate B-live — live drag is shared via AWARENESS, not the CRDT.
 *
 * Two playground tabs link over the BroadcastChannel. While page A drags a
 * node, page B must see the node move through several intermediate positions
 * (the translucent live-interaction ghost driven by awareness), WHILE page B's
 * encoded Yjs document stays ~flat — proving the per-frame geometry never
 * touches the CRDT. Only the settle frame commits to Yjs.
 *
 * Driver constraints:
 *  - A is foregrounded (`bringToFront`) so its rAF live-interaction publisher
 *    isn't throttled. A small real-time pause between A's pointer moves lets
 *    the browser's own rAF fire, so each move publishes a distinct awareness
 *    interaction (driving the drag from a page.evaluate rAF loop instead
 *    cancels React-Flow's drag).
 *  - Playwright cannot interleave actions on B *while A holds the mouse down*
 *    (the held drag serializes the input subsystem and deadlocks). So B records
 *    ghost positions passively via an in-page observer installed BEFORE the
 *    drag, read back only AFTER A releases.
 *  - The collaboration playground opens side panels that overlap the canvas and
 *    pans nodes partly off-screen, so we collapse the panels, fit the view, and
 *    pick a node whose center actually hit-tests to itself before dragging.
 */

test.describe.configure({ mode: "serial" })

const fixture = loadFixture("perf-30-nodes.json")
const MIN_INTERMEDIATE_POSITIONS = 3
const B_DOC_GROWTH_BUDGET = 2 * 1024
const NODE_COUNT = 30

type GhostWindow = Window & { __ghostLefts?: number[] }

const openCollaboratingPlayground = async (page: Page) => {
  await injectFixtureIntoLocalStorage(page, {
    ...fixture,
    id: playgroundModelId,
  })
  await page.goto("/playground?perfHooks=1")
  await page.locator("#collaboration-viewport-test").check()
  await waitForCanvasReady(page)
  await page.waitForFunction(() =>
    Boolean((window as Window & { __apollonPerf?: unknown }).__apollonPerf)
  )
}

const collapsePanels = async (page: Page) => {
  for (const label of [
    "Collapse playground controls",
    "Collapse test sidebar",
  ]) {
    const button = page.getByRole("button", { name: label })
    if (await button.count()) await button.first().click()
  }
  await page.waitForTimeout(200)
}

/** Fit the view, then return the first fixture node whose center hit-tests to
 * itself (i.e. is unobstructed and on-screen) so the drag actually grabs it. */
const findGrabbableNode = async (page: Page) => {
  await page.locator(".react-flow__controls-fitview").click()
  await page.waitForTimeout(500)
  for (let i = 0; i < NODE_COUNT; i++) {
    const id = `perf-node-${String(i).padStart(2, "0")}`
    const box = await page
      .locator(`.react-flow__node[data-id="${id}"]`)
      .first()
      .boundingBox()
      .catch(() => null)
    if (!box) continue
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    const onTop = await page.evaluate(
      ({ x, y, id }) =>
        document
          .elementFromPoint(x, y)
          ?.closest(".react-flow__node")
          ?.getAttribute("data-id") === id,
      { x: cx, y: cy, id }
    )
    if (onTop) return { id, cx, cy }
  }
  return null
}

test("page B sees A's live drag move while B's Yjs doc stays flat", async ({
  page,
  context,
}) => {
  const pageA = page
  const pageB = await context.newPage()

  await openCollaboratingPlayground(pageA)
  await openCollaboratingPlayground(pageB)

  // Both tabs converge on the fixture nodes over the channel.
  await expect
    .poll(async () => (await readPerf(pageB)).nodesMapSize)
    .toBe(NODE_COUNT)

  // Install B's passive ghost-position recorder before A starts dragging.
  await pageB.evaluate(() => {
    const w = window as GhostWindow
    w.__ghostLefts = []
    const record = () => {
      const ghost = document.querySelector<HTMLElement>(
        ".apollon-collaboration-live-interaction"
      )
      if (ghost) {
        w.__ghostLefts!.push(Math.round(ghost.getBoundingClientRect().left))
      }
    }
    new MutationObserver(record).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["style"],
    })
  })

  // Foreground A so its rAF live-interaction publisher isn't throttled.
  await pageA.bringToFront()
  await collapsePanels(pageA)

  const target = await findGrabbableNode(pageA)
  if (!target) throw new Error("no grabbable fixture node found on page A")

  const bDocBefore = (await readPerf(pageB)).encodedDocBytes

  // Drive A's drag entirely on A; pause between moves so each publishes a
  // distinct interaction (no cross-page ops while the button is held).
  await pageA.mouse.move(target.cx, target.cy)
  await pageA.mouse.down()
  const STEPS = 14
  for (let i = 1; i <= STEPS; i++) {
    await pageA.mouse.move(target.cx + i * 14, target.cy + i * 8)
    await pageA.waitForTimeout(45)
  }
  await pageA.mouse.up()

  // Let B's pending channel messages / commits drain, then read the recording.
  await pageB.waitForTimeout(300)
  const distinctLefts = await pageB.evaluate(() => {
    const w = window as GhostWindow
    return new Set(w.__ghostLefts ?? []).size
  })

  // B saw the drag through multiple distinct intermediate ghost positions...
  expect(distinctLefts).toBeGreaterThanOrEqual(MIN_INTERMEDIATE_POSITIONS)

  // ...yet none of those frames grew B's CRDT: only the single settle commit
  // crosses the channel into Yjs. We assert doc-growth flatness (the freeze
  // invariant), not B's ghost-render cost — the freeze was Yjs growth, not
  // render CPU.
  const bDocAfter = (await readPerf(pageB)).encodedDocBytes
  expect(bDocAfter - bDocBefore).toBeLessThan(B_DOC_GROWTH_BUDGET)
})
