import { test, expect } from "@playwright/test"
import { loadFixture, readPerf, dragNodeBy } from "./perfHelpers"
import {
  injectFixtureIntoLocalStorage,
  waitForCanvasReady,
} from "../helpers/canvas"

// Mirrors `playgroundModelId` in src/constants/playgroundDefaultDiagram.ts.
// Inlined (not imported) so this Playwright spec doesn't pull a `src` module
// that transitively resolves `@tumaet/apollon/react` through the library's
// built `dist` types, which aren't on the test process's resolution path.
const playgroundModelId = "playgroundModelId"

/**
 * Gate C — broadcast amplification budget.
 *
 * In collaboration mode every "store" Yjs transaction is sent as its own
 * YjsUpdate frame. The old per-frame node write turned a single drag into
 * dozens of broadcast messages; the fix commits only the settle frame, so a
 * drag must emit at most a couple of YjsUpdate frames (the settle write and
 * at most one drag-stop commit).
 */

test.describe.configure({ mode: "serial" })

const fixture = loadFixture("perf-30-nodes.json")
const DRAG_COUNT = 10
const MAX_BROADCASTS_PER_DRAG = 2

test("a drag emits at most 2 YjsUpdate broadcasts in collaboration mode", async ({
  page,
}) => {
  // Re-key the fixture onto the playground model id so the playground mounts
  // with 30 draggable nodes instead of its empty default.
  await injectFixtureIntoLocalStorage(page, {
    ...fixture,
    id: playgroundModelId,
  })

  await page.goto("/playground?perfHooks=1")
  // Enable collaboration: this remounts the editor, connects the playground
  // BroadcastChannel sink, and re-installs the perf hook in onMount.
  await page.locator("#collaboration-viewport-test").check()
  await waitForCanvasReady(page)
  await page.waitForFunction(() =>
    Boolean((window as Window & { __apollonPerf?: unknown }).__apollonPerf)
  )

  // Wait for the collaboration remount to settle to exactly the 30 fixture
  // nodes before sampling, so a transient duplicate can't fault the drag.
  await expect(page.locator(".react-flow__node")).toHaveCount(30)

  const baseline = await readPerf(page)
  expect(baseline.nodesMapSize).toBe(30)

  for (let i = 0; i < DRAG_COUNT; i++) {
    const node = page
      .locator(
        `.react-flow__node[data-id="perf-node-${String(i % 30).padStart(
          2,
          "0"
        )}"]`
      )
      .first()
    const dir = i % 2 === 0 ? 1 : -1
    await dragNodeBy(node, page, 24 * dir, 16 * dir)
  }

  const after = await readPerf(page)

  const writes = after.storeNodeWrites - baseline.storeNodeWrites
  const broadcasts = after.broadcastYjsMsgs - baseline.broadcastYjsMsgs

  // Meta-assertion: the gestures must have actually committed writes AND been
  // broadcast — a no-op driver or an unconnected sink would record zero.
  expect(writes).toBeGreaterThanOrEqual(1)
  expect(broadcasts).toBeGreaterThanOrEqual(1)

  expect(broadcasts / DRAG_COUNT).toBeLessThanOrEqual(MAX_BROADCASTS_PER_DRAG)
})
