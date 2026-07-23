import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import {
  waitForCanvasReady,
  openFixtureInLocalEditor,
  selectEdgeOnPath,
} from "../helpers/canvas"

// A pinned endpoint is manual routing state even when the path itself is
// automatic, so the edge must still provide a way back to full auto-routing.

const __dirname2 = path.dirname(fileURLToPath(import.meta.url))
const load = (name: string) =>
  JSON.parse(
    fs.readFileSync(path.join(__dirname2, "..", "fixtures", name), "utf-8")
  ) as Record<string, unknown> & { edges: { id: string }[] }

const pinnedFixture = load("edge-pinned-anchors.json")

test("a pinned-anchor edge exposes reset routing", async ({ page }) => {
  await openFixtureInLocalEditor(page, pinnedFixture)
  await waitForCanvasReady(page)
  const id = pinnedFixture.edges[0].id

  await selectEdgeOnPath(page, id)

  const resetButton = page.getByRole("button", { name: "Reset routing" })
  await expect(resetButton).toBeVisible()

  // Reset hands the edge fully back to the router, so there is no longer any
  // manual routing state to reset.
  await resetButton.click()
  await expect(page.getByRole("button", { name: "Reset routing" })).toHaveCount(
    0
  )
})

test("a fully auto edge shows no reset button", async ({ page }) => {
  // Same geometry, but the edge keeps its default auto anchoring (no custom
  // anchors, no waypoints) — nothing to reset.
  const auto = load("edge-pinned-anchors.json")
  const edgeData = (auto.edges[0] as { data: Record<string, unknown> }).data
  delete edgeData.sourceAnchor
  delete edgeData.targetAnchor

  await openFixtureInLocalEditor(page, auto)
  await waitForCanvasReady(page)
  const id = auto.edges[0].id

  await selectEdgeOnPath(page, id)

  await expect(page.getByRole("button", { name: "Reset routing" })).toHaveCount(
    0
  )
})
