import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"
import { readEdgePathVertices } from "../helpers/edgeGeometry"

const __d = path.dirname(fileURLToPath(import.meta.url))

test("a hand-drawn multi-corner edge keeps all its bends on load", async ({
  page,
}) => {
  const fx = JSON.parse(
    fs.readFileSync(
      path.join(__d, "..", "fixtures", "edge-manual-bends-multi-corner.json"),
      "utf-8"
    )
  )
  const edgeId = fx.edges[0].id as string
  const authoredPoints = fx.edges[0].data.points
  expect(authoredPoints).toHaveLength(7)

  await openFixtureInLocalEditor(page, fx)
  await waitForCanvasReady(page)

  const persistedPoints = () =>
    page.evaluate((id) => {
      const persisted = localStorage.getItem("persistenceModelStore")
      if (!persisted) return null
      const state = JSON.parse(persisted).state
      const model = state.models?.[state.currentModelId]?.model
      return model?.edges?.find((edge: { id: string }) => edge.id === id)?.data
        ?.points
    }, edgeId)

  await expect
    .poll(async () => (await persistedPoints())?.length)
    .toBe(authoredPoints.length)
  const normalizedPoints = await persistedPoints()
  expect(normalizedPoints).not.toBeNull()
  normalizedPoints.forEach((point: { x: number; y: number }, index: number) => {
    expect(Math.abs(point.x - authoredPoints[index].x)).toBeLessThanOrEqual(1)
    expect(Math.abs(point.y - authoredPoints[index].y)).toBeLessThanOrEqual(1)
  })
  await expect
    .poll(async () => (await readEdgePathVertices(page, edgeId)).length)
    .toBe(authoredPoints.length)

  await page.reload()
  await waitForCanvasReady(page)
  await expect.poll(persistedPoints).toEqual(normalizedPoints)
})
