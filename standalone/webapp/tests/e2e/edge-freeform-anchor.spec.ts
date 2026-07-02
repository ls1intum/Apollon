import { test, expect, type Locator, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { waitForCanvasReady, openFixtureInLocalEditor } from "../helpers/canvas"

const __d = path.dirname(fileURLToPath(import.meta.url))
const classFixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "two-class-fresh-edge.json"),
    "utf-8"
  )
) as Record<string, unknown>
const objectFixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "object-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>
const syntaxTreeFixture = JSON.parse(
  fs.readFileSync(path.join(__d, "..", "fixtures", "syntax-tree.json"), "utf-8")
) as Record<string, unknown>

type Pt = { x: number; y: number }

function edgeById(page: Page, id: string): Locator {
  return page.locator(`.react-flow__edge[data-id="${id}"]`)
}

async function selectEdge(page: Page, id: string): Promise<Locator> {
  const edge = edgeById(page, id)
  await edge.locator(".edge-overlay, path").first().click({ force: true })
  await page.waitForTimeout(150)
  return edge
}

function endPointOf(d: string | null): Pt {
  if (!d) throw new Error("edge path has no d attribute")
  const matches = [...d.matchAll(/[ML]\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/g)]
  if (matches.length === 0) throw new Error(`edge path has no points: ${d}`)
  const end = matches[matches.length - 1]
  return { x: Number(end[1]), y: Number(end[2]) }
}

async function targetPointOf(edge: Locator): Promise<Pt> {
  return endPointOf(
    await edge.locator(".react-flow__edge-path").first().getAttribute("d")
  )
}

async function storedNodePosition(page: Page, targetId: string): Promise<Pt> {
  return page.evaluate((targetId) => {
    const raw = localStorage.getItem("persistenceModelStore")
    if (!raw) throw new Error("missing persistence model")
    const parsed = JSON.parse(raw)
    const id = parsed.state.currentModelId
    const nodes = parsed.state.models[id]?.model?.nodes ?? []
    const node = nodes.find((candidate: { id: string }) => {
      return candidate.id === targetId
    })
    if (!node) throw new Error(`missing node ${targetId}`)
    return node.position as Pt
  }, targetId)
}

async function dragLocatorBy(
  page: Page,
  locator: Locator,
  dx: number,
  dy: number
) {
  const box = await locator.boundingBox()
  if (!box) throw new Error("locator has no bounding box")
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(350)
}

async function expectFreeformTargetFollowsMovedNode({
  page,
  fixture,
  edgeId,
  targetId,
}: {
  page: Page
  fixture: Record<string, unknown>
  edgeId: string
  targetId: string
}) {
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)

  const edge = await selectEdge(page, edgeId)
  const targetHandle = edge.locator(".edge-endpoint-handle--target")
  const targetGrip = edge.locator(".edge-endpoint-grip--target")
  await expect(targetHandle).toBeVisible()
  await expect
    .poll(() =>
      targetGrip.evaluate((element) => getComputedStyle(element).opacity)
    )
    .toBe("1")
  const targetGripBox = await targetGrip.boundingBox()
  if (!targetGripBox)
    throw new Error("target endpoint grip has no bounding box")
  const initialHandleBox = await targetHandle.boundingBox()
  if (!initialHandleBox) throw new Error("target endpoint has no bounding box")
  expect(targetGripBox.width).toBeLessThan(initialHandleBox.width / 2)
  expect(targetGripBox.height).toBeLessThan(initialHandleBox.height / 2)
  expect(Math.max(targetGripBox.width, targetGripBox.height)).toBeGreaterThan(
    Math.min(targetGripBox.width, targetGripBox.height)
  )

  const targetNode = page.locator(`.react-flow__node[data-id="${targetId}"]`)
  const targetBox = await targetNode.boundingBox()
  if (!targetBox) throw new Error("target node has no bounding box")

  await page.mouse.move(
    initialHandleBox.x + initialHandleBox.width / 2,
    initialHandleBox.y + initialHandleBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(targetBox.x + 3, targetBox.y + 24, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(400)

  const targetBefore = await targetPointOf(edge)
  const nodeBefore = await storedNodePosition(page, targetId)

  await dragLocatorBy(page, targetNode, 90, 45)

  const targetAfter = await targetPointOf(edge)
  const nodeAfter = await storedNodePosition(page, targetId)
  const nodeDelta = {
    x: nodeAfter.x - nodeBefore.x,
    y: nodeAfter.y - nodeBefore.y,
  }
  const endpointDelta = {
    x: targetAfter.x - targetBefore.x,
    y: targetAfter.y - targetBefore.y,
  }

  expect(endpointDelta.x).toBeCloseTo(nodeDelta.x, 0)
  expect(endpointDelta.y).toBeCloseTo(nodeDelta.y, 0)
}

const cases = [
  {
    name: "ClassDiagram",
    fixture: classFixture,
    edgeId: "231f7ef5-b43d-4187-8996-f7726ed6e919",
    targetId: "32659cdc-bd03-46f3-918c-ee8dbba9c15b",
  },
  {
    name: "ObjectDiagram",
    fixture: objectFixture,
    edgeId: "edge-link-dog-owner",
    targetId: "660e8400-e29b-41d4-a716-446655440011",
  },
  {
    name: "SyntaxTree",
    fixture: syntaxTreeFixture,
    edgeId: "edge-expr-term-left",
    targetId: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b",
  },
]

for (const { name, fixture, edgeId, targetId } of cases) {
  test(`a freeform ${name} edge endpoint follows its node after the node moves`, async ({
    page,
  }) => {
    await expectFreeformTargetFollowsMovedNode({
      page,
      fixture,
      edgeId,
      targetId,
    })
  })
}
