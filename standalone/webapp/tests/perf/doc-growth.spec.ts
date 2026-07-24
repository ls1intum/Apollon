import { test, expect } from "@playwright/test"
import {
  loadFixture,
  openLocalWithPerf,
  readPerf,
  dragNodeBy,
  nodeNearestViewportCenter,
} from "./perfHelpers"

/**
 * Single-user Yjs document-growth budget under sustained dragging.
 *
 * In single-user editing an always-on UndoManager pins every CRDT struct, so
 * writing the node on each drag frame (~60/s) would grow the document
 * unbounded. The editor commits only the settled position, so the encoded
 * document must stay small and scale with the number of *gestures*, not frames.
 */

test.describe.configure({ mode: "serial" })

const fixture = loadFixture("perf-30-nodes.json")
const DRAG_COUNT = 40
const BYTE_BUDGET = 256 * 1024
// A drag commits ~one settle write; writing every frame would be ~one per
// frame. 1.5 writes/gesture sits well under the per-frame rate and tolerates an
// occasional extra commit.
const MAX_WRITES_PER_DRAG = 1.5
// Bytes added per gesture: a settle-only commit adds ~100 B/drag, while
// persisting every frame adds ~900 B/drag. 512 sits firmly between them.
const BYTES_PER_DRAG_BUDGET = 512

test("encoded Yjs doc stays bounded across many drag gestures", async ({
  page,
}) => {
  await openLocalWithPerf(page, fixture)

  const baseline = await readPerf(page)
  expect(baseline.nodesMapSize).toBe(30)

  // React Flow virtualizes off-viewport nodes, so fixture order is not a stable
  // source of mounted targets across browser engines and viewport sizes.
  const editor = page.locator(`#react-flow-library-${String(fixture.id)}`)
  const nodeId = await nodeNearestViewportCenter(editor, page.viewportSize()!)
  expect(nodeId).not.toBeNull()
  const node = editor.locator(`.react-flow__node[data-id="${nodeId}"]`)
  for (let i = 0; i < DRAG_COUNT; i++) {
    // Alternate direction so the target returns to its starting position.
    const dir = i % 2 === 0 ? 1 : -1
    await dragNodeBy(node, page, 24 * dir, 16 * dir, {
      waitForRouting: false,
    })
  }

  const after = await readPerf(page)

  const writesAdded = after.storeNodeWrites - baseline.storeNodeWrites
  const bytesAdded = after.encodedDocBytes - baseline.encodedDocBytes

  // Meta-assertion: most gestures must commit. This prevents a partially
  // defanged driver from making the upper write/byte budgets pass vacuously.
  expect(writesAdded).toBeGreaterThanOrEqual(DRAG_COUNT * 0.75)

  // Absolute budget: stays far under a generous ceiling.
  expect(after.encodedDocBytes).toBeLessThan(BYTE_BUDGET)

  // Write-rate budget: only the settle frame should commit, so writes scale
  // with gestures, not with per-frame position changes. This is the metric
  // that blows up under the OLD per-frame-write behavior.
  expect(writesAdded / DRAG_COUNT).toBeLessThanOrEqual(MAX_WRITES_PER_DRAG)

  // Slope budget: bytes added per gesture is small.
  expect(bytesAdded / DRAG_COUNT).toBeLessThan(BYTES_PER_DRAG_BUDGET)
})
