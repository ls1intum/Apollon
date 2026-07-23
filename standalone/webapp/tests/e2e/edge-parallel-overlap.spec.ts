import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"
import { coincidentSampleCount, sampleEdgePath } from "../helpers/edgeGeometry"

/**
 * Two associations between the same pair of classes must be drawn as two
 * distinguishable lines, not one line with the second hidden underneath. This is
 * the #115 / #268 family (parallel edges collapsing onto each other), and it is
 * a semantic bug as much as a visual one — an aggregation drawn over an
 * association reads as the wrong relationship.
 */

const __d = path.dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "edge-parallel-pair.json"),
    "utf-8"
  )
) as Record<string, unknown>

const EDGE_A = "edge-1-first"
const EDGE_B = "edge-2-second"

test("two edges between the same nodes do not overlap each other", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)

  const [a, b] = await Promise.all([
    sampleEdgePath(page, EDGE_A),
    sampleEdgePath(page, EDGE_B),
  ])
  expect(a.length, "first edge did not render").toBeGreaterThan(0)
  expect(b.length, "second edge did not render").toBeGreaterThan(0)

  // Almost no sampled point of one edge may coincide with the other. A handful
  // near the shared node borders is unavoidable; a full overlap is not.
  const coincident = await coincidentSampleCount(page, EDGE_A, EDGE_B)
  expect(
    coincident,
    `the two edges are drawn on top of each other (${coincident} coincident samples)`
  ).toBeLessThan(6)
})
