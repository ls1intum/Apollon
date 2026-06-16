import { test, expect } from "@playwright/test"
import {
  loadFixture,
  openLocalWithPerf,
  readPerf,
  dragNodeBy,
} from "./perfHelpers"

/**
 * Gate A — Yjs document-growth budget under sustained dragging.
 *
 * This is the PRIMARY exam regression: Apollon-in-Artemis exams are single
 * user, so the local editor (no collaboration) is the path that froze. The
 * old code wrote the full node object to the Yjs map on every React-Flow drag
 * frame (~60/s) while an always-on UndoManager pinned each intermediate struct
 * so GC couldn't reclaim it — measured ~335x growth at 200 drags. The fix only
 * commits the settle frame, so the doc must stay tiny and grow ~linearly (and
 * very slowly) in the number of *gestures*, not frames.
 */

test.describe.configure({ mode: "serial" })

const fixture = loadFixture("perf-30-nodes.json")
const DRAG_COUNT = 40
const BYTE_BUDGET = 256 * 1024
// A drag must commit ~one settle write, not one-per-frame. Measured: ~26 with
// the fix vs ~229 with per-frame writes for 40 drags — 1.5x/gesture cleanly
// separates the two and tolerates the odd extra commit.
const MAX_WRITES_PER_DRAG = 1.5
// Bytes added per gesture. Measured: ~108 B/drag with the fix vs ~917 B/drag
// when transient frames persist; 512 sits firmly between them.
const BYTES_PER_DRAG_BUDGET = 512

test("encoded Yjs doc stays bounded across many drag gestures", async ({
  page,
}) => {
  await openLocalWithPerf(page, fixture)

  const baseline = await readPerf(page)
  expect(baseline.nodesMapSize).toBe(30)

  for (let i = 0; i < DRAG_COUNT; i++) {
    const node = page.locator(
      `.react-flow__node[data-id="perf-node-${String(i % 30).padStart(
        2,
        "0"
      )}"]`
    )
    // Alternate direction so nodes don't march off-screen and stay grabbable.
    const dir = i % 2 === 0 ? 1 : -1
    await dragNodeBy(node, page, 24 * dir, 16 * dir)
  }

  const after = await readPerf(page)

  const writesAdded = after.storeNodeWrites - baseline.storeNodeWrites
  const bytesAdded = after.encodedDocBytes - baseline.encodedDocBytes

  // Meta-assertion: a defanged driver that never actually grabbed a node
  // would record zero store writes — fail loudly instead of passing green.
  expect(writesAdded).toBeGreaterThanOrEqual(1)

  // Absolute budget: stays far under a generous ceiling.
  expect(after.encodedDocBytes).toBeLessThan(BYTE_BUDGET)

  // Write-rate budget: only the settle frame should commit, so writes scale
  // with gestures, not with per-frame position changes. This is the metric
  // that blows up under the OLD per-frame-write behavior.
  expect(writesAdded / DRAG_COUNT).toBeLessThanOrEqual(MAX_WRITES_PER_DRAG)

  // Slope budget: bytes added per gesture is small.
  expect(bytesAdded / DRAG_COUNT).toBeLessThan(BYTES_PER_DRAG_BUDGET)
})
