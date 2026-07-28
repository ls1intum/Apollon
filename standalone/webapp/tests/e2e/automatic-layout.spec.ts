import { expect, test } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { openFixtureInLocalEditor, waitForCanvasReady } from "../helpers/canvas"

const fixtureDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures"
)
const readFixture = (name: string) =>
  JSON.parse(
    fs.readFileSync(path.join(fixtureDirectory, `${name}.json`), "utf8")
  ) as Record<string, unknown>

const fixture = readFixture("automatic-layout-star")

test("the reported class star is compacted and fitted into view", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)

  const readLayoutState = () =>
    page.evaluate(() => {
      const editor = (
        window as unknown as {
          apollonEditor: {
            model: {
              nodes: Array<{
                id: string
                position: { x: number; y: number }
                width: number
                height: number
              }>
            }
          }
        }
      ).apollonEditor
      const nodes = editor.model.nodes
      const minX = Math.min(...nodes.map((node) => node.position.x))
      const minY = Math.min(...nodes.map((node) => node.position.y))
      const maxX = Math.max(
        ...nodes.map((node) => node.position.x + node.width)
      )
      const maxY = Math.max(
        ...nodes.map((node) => node.position.y + node.height)
      )
      return {
        positions: Object.fromEntries(
          nodes.map(({ id, position }) => [id, position])
        ),
        area: (maxX - minX) * (maxY - minY),
        viewport: document.querySelector<HTMLElement>(".react-flow__viewport")
          ?.style.transform,
      }
    })
  const before = await readLayoutState()

  await page.getByRole("button", { name: "Arrange diagram" }).click()

  const status = page.getByRole("status")
  await expect(status).toHaveText("Diagram arranged and fitted to view.")
  await expect(page.getByRole("alert")).toHaveCount(0)
  const after = await readLayoutState()
  expect(after.positions).not.toEqual(before.positions)
  expect(after.area).toBeLessThan(before.area * 0.65)
  await expect
    .poll(async () => (await readLayoutState()).viewport)
    .not.toBe(before.viewport)

  const boxes = await page.locator(".react-flow__node").evaluateAll((nodes) =>
    nodes.map((node) => {
      const { left, right, top, bottom } = node.getBoundingClientRect()
      return { left, right, top, bottom }
    })
  )
  const canvas = await page.locator(".react-flow").evaluate((element) => {
    const { left, right, top, bottom } = element.getBoundingClientRect()
    return { left, right, top, bottom }
  })
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(canvas.left)
    expect(box.right).toBeLessThanOrEqual(canvas.right)
    expect(box.top).toBeGreaterThanOrEqual(canvas.top)
    expect(box.bottom).toBeLessThanOrEqual(canvas.bottom)
  }
  for (let first = 0; first < boxes.length; first++)
    for (let second = first + 1; second < boxes.length; second++)
      expect(
        boxes[first].right <= boxes[second].left ||
          boxes[second].right <= boxes[first].left ||
          boxes[first].bottom <= boxes[second].top ||
          boxes[second].bottom <= boxes[first].top
      ).toBe(true)
})

test("manual routes require confirmation and undo restores routes with positions", async ({
  page,
}) => {
  const model = structuredClone(fixture) as {
    id: string
    nodes: Array<{ id: string; position: { x: number; y: number } }>
    edges: Array<{
      id: string
      data?: Record<string, unknown>
    }>
  } & Record<string, unknown>
  model.id = "automatic-layout-manual-route"
  model.nodes[1].position = { ...model.nodes[0].position }
  model.edges[0].data = {
    ...(model.edges[0].data ?? {}),
    points: [{ x: 300, y: 435 }],
    sourceAnchor: { side: "right", ratio: 0.5 },
  }

  await openFixtureInLocalEditor(page, model)
  await waitForCanvasReady(page)

  const readModelState = () =>
    page.evaluate(() => {
      const model = (
        window as unknown as {
          apollonEditor: {
            model: {
              nodes: Array<{ id: string; position: { x: number; y: number } }>
              edges: Array<{
                id: string
                data?: {
                  points?: Array<{ x: number; y: number }>
                  sourceAnchor?: { side: string; ratio: number }
                  targetAnchor?: { side: string; ratio: number }
                }
              }>
            }
          }
        }
      ).apollonEditor.model
      const routed = model.edges[0]
      return {
        positions: Object.fromEntries(
          model.nodes.map(({ id, position }) => [id, position])
        ),
        route: {
          points: routed.data?.points ?? [],
          sourceAnchor: routed.data?.sourceAnchor ?? null,
          targetAnchor: routed.data?.targetAnchor ?? null,
        },
      }
    })
  const before = await readModelState()
  const arrange = page.getByRole("button", { name: "Arrange diagram" })

  await arrange.click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toHaveAccessibleName("Replace manual edge routing?")
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toHaveCount(0)
  expect(await readModelState()).toEqual(before)

  await arrange.click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Replace and arrange" })
    .click()
  await expect(page.getByRole("status")).toHaveText(
    "Diagram arranged and fitted to view. 1 visible manual edge route was replaced. Undo restores the positions and route."
  )

  const arranged = await readModelState()
  expect(arranged.positions).not.toEqual(before.positions)
  expect(arranged.route).toEqual({
    points: [],
    sourceAnchor: null,
    targetAnchor: null,
  })

  await page.getByRole("button", { name: "Undo" }).click()
  await expect.poll(readModelState).toEqual(before)
})

for (const name of [
  "activity-diagram",
  "communication-diagram",
  "petri-net",
  "syntax-tree",
  "sfc",
  "reachability-graph",
  "flowchart",
  "object-diagram",
] as const)
  test(`arranges the flat ${name} fixture without a refusal`, async ({
    page,
  }) => {
    await openFixtureInLocalEditor(page, readFixture(name))
    await waitForCanvasReady(page)

    const arrange = page.getByRole("button", { name: "Arrange diagram" })
    await expect(arrange).not.toHaveAttribute("aria-disabled", "true")
    await arrange.click()
    await expect(page.getByRole("status")).toHaveText(
      /^(Diagram arranged and fitted to view\.|No clearer arrangement was found\.)$/
    )
    await expect(page.getByRole("alert")).toHaveCount(0)

    const positions = await page.evaluate(() =>
      (
        window as unknown as {
          apollonEditor: {
            model: { nodes: Array<{ position: { x: number; y: number } }> }
          }
        }
      ).apollonEditor.model.nodes.map(({ position }) => position)
    )
    expect(
      positions.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))
    ).toBe(true)
  })
