import { test, expect } from "@playwright/test"
import {
  dragNodeBy,
  loadFixture,
  openLocalWithPerf,
  readPerf,
} from "./perfHelpers"

test.describe.configure({ mode: "serial" })

const MAX_P95_INTERACTION_FRAME_MS = 40
const MAX_STRAIGHT_SOLVE_MS = 500

test("dense straight-edge crossings stay responsive and node-driven", async ({
  page,
}) => {
  const base = loadFixture("syntax-tree.json")
  const sideCount = 12
  const nodes = Array.from({ length: sideCount * 2 }, (_, index) => {
    const side = index < sideCount ? 0 : 1
    const slot = index % sideCount
    return {
      id: `cross-node-${index}`,
      width: 120,
      height: 70,
      measured: { width: 120, height: 70 },
      type: "syntaxTreeNonterminal",
      position: {
        x: side === 0 ? 220 : 1_020,
        y: -500 + slot * 140,
      },
      data: { name: `N${index}` },
    }
  })
  const edges = Array.from({ length: sideCount }, (_, index) => ({
    id: `cross-edge-${index}`,
    source: `cross-node-${index}`,
    target: `cross-node-${sideCount + sideCount - 1 - index}`,
    type: "SyntaxTreeLink",
    data: { points: [] },
  }))
  const fixture = {
    ...base,
    id: "straight-routing-crossing-performance",
    nodes,
    edges,
  }
  await openLocalWithPerf(page, fixture)

  const editor = page.locator(`#react-flow-library-${fixture.id}`)
  const node = editor.locator('.react-flow__node[data-id="cross-node-5"]')
  const before = await readPerf(page, true)
  const frames = await dragNodeBy(node, page, 180, 90, {
    steps: 30,
    measureFrames: true,
  })
  const after = await readPerf(page, true)
  const sorted = [...frames].sort((a, b) => a - b)
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0

  expect(
    after.workerSmallSyncCount - before.workerSmallSyncCount,
    "a small straight-edge drag fell back to whole-diagram main-thread solves"
  ).toBe(0)
  expect(
    after.workerSolveCount - before.workerSolveCount,
    "the straight-edge interaction never reached the routing Worker"
  ).toBeGreaterThan(0)
  expect(
    after.solveMaxMs,
    "one straight-edge solve is paying for edge crossings as graph obstacles"
  ).toBeLessThan(MAX_STRAIGHT_SOLVE_MS)
  expect(p95, `straight-edge drag p95 was ${p95.toFixed(1)} ms`).toBeLessThan(
    MAX_P95_INTERACTION_FRAME_MS
  )
})
