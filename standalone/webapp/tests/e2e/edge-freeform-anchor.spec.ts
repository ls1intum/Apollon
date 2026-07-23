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
const classNoEdgeFixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "two-class-no-edge.json"),
    "utf-8"
  )
) as Record<string, unknown>
const componentFixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "component-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>
const deploymentFixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "deployment-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>
const syntaxTreeFixture = JSON.parse(
  fs.readFileSync(path.join(__d, "..", "fixtures", "syntax-tree.json"), "utf-8")
) as Record<string, unknown>
const useCaseFixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "use-case-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>

type Pt = { x: number; y: number }
const CLASS_SOURCE = "95aac2b6-3e6b-4e6d-9201-52a498e6ea20"

function edgeById(page: Page, id: string): Locator {
  return page.locator(`.react-flow__edge[data-id="${id}"]`)
}

async function selectEdge(page: Page, id: string): Promise<Locator> {
  const edge = edgeById(page, id)
  await edge.locator(".edge-overlay, path").first().click({ force: true })
  // Selection renders the endpoint handles; wait for that rather than sleeping.
  await expect(edge.locator(".edge-endpoint-handle--target")).toBeVisible()
  return edge
}

async function centerOf(locator: Locator): Promise<Pt> {
  const box = await locator.boundingBox()
  if (!box) throw new Error("locator has no bounding box")

  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  }
}

/** The rendered target endpoint, transformed from SVG path space to screen space. */
async function targetEndpointOf(edge: Locator): Promise<Pt> {
  return edge.locator(".react-flow__edge-path").evaluate((element) => {
    const path = element as SVGPathElement
    const matrix = path.getScreenCTM()
    if (!matrix) throw new Error("edge path has no screen transform")

    const point = path.getPointAtLength(path.getTotalLength())
    const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(matrix)
    return { x: screenPoint.x, y: screenPoint.y }
  })
}

/** The persisted `{side, ratio}` anchor of an edge's target endpoint. */
async function targetAnchorOf(page: Page, edgeId: string) {
  return page.evaluate((id) => {
    const raw = localStorage.getItem("persistenceModelStore")
    if (!raw) return null
    const p = JSON.parse(raw)
    const model = p.state.models[p.state.currentModelId]?.model
    const edge = (model?.edges || []).find((e: { id: string }) => e.id === id)
    return edge?.data?.targetAnchor ?? null
  }, edgeId)
}

async function storedEdges(page: Page): Promise<
  Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string | null
    targetHandle?: string | null
    data?: Record<string, unknown>
  }>
> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("persistenceModelStore")
    if (!raw) throw new Error("missing persistence model")
    const parsed = JSON.parse(raw)
    const id = parsed.state.currentModelId
    return parsed.state.models[id]?.model?.edges ?? []
  })
}

async function dragLocatorBy(
  page: Page,
  locator: Locator,
  dx: number,
  dy: number
) {
  const box = await locator.boundingBox()
  if (!box) throw new Error("locator has no bounding box")
  // Grab near the top edge, not the centre: a container's centre is covered by
  // its children (dragging there would move a child, not the container).
  const x = box.x + box.width / 2
  const y = box.y + Math.min(box.height * 0.2, 8)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 12 })
  await page.mouse.up()
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
  await expect(targetHandle).toBeVisible()
  // Reading the handle box waits for the endpoint to lay out, settling the edge
  // geometry before the drag. (Grip size/shape is covered by the marker tests.)
  const initialHandleBox = await targetHandle.boundingBox()
  if (!initialHandleBox) throw new Error("target endpoint has no bounding box")

  const targetNode = page.locator(`.react-flow__node[data-id="${targetId}"]`)
  const targetBox = await targetNode.boundingBox()
  if (!targetBox) throw new Error("target node has no bounding box")

  await page.mouse.move(
    initialHandleBox.x + initialHandleBox.width / 2,
    initialHandleBox.y + initialHandleBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    targetBox.x +
      Math.min(Math.max(targetBox.width * 0.15, 3), targetBox.width - 3),
    targetBox.y +
      Math.min(Math.max(targetBox.height * 0.25, 3), targetBox.height - 3),
    { steps: 12 }
  )
  await page.mouse.up()
  // The freeform endpoint drag persists a {side, ratio} anchor; wait for that
  // commit rather than sleeping, then capture the pre-move baseline.
  await expect.poll(() => targetAnchorOf(page, edgeId)).not.toBeNull()

  const anchorBefore = await targetAnchorOf(page, edgeId)
  const nodeBefore = await centerOf(targetNode)
  const endpointBefore = await targetEndpointOf(edge)

  // Move the node so its endpoint has to follow. A child pinned to its parent's
  // border (e.g. a component interface) can't be dragged freely on its own, so
  // move its parent — the child, and the endpoint, travel with it rigidly.
  const parentId = await page.evaluate((id) => {
    const raw = localStorage.getItem("persistenceModelStore")
    if (!raw) return null
    const p = JSON.parse(raw)
    const model = p.state.models[p.state.currentModelId]?.model
    return (
      model?.nodes.find((n: { id: string }) => n.id === id)?.parentId ?? null
    )
  }, targetId)
  const nodeToMove = parentId
    ? page.locator(`.react-flow__node[data-id="${parentId}"]`)
    : targetNode
  await dragLocatorBy(page, nodeToMove, 90, 45)

  // Retry until the node has actually moved (>20px, else the check is vacuous)
  // AND the endpoint has travelled with it. A few px of slack absorbs a straight
  // edge's grip rotating to the new angle (which nudges the handle's axis-aligned
  // bbox centre); polling waits out the edge re-render instead of a fixed sleep.
  await expect
    .poll(
      async () => {
        const nodeAfter = await centerOf(targetNode)
        const endpointAfter = await targetEndpointOf(edge)
        const nodeMoved = Math.hypot(
          nodeAfter.x - nodeBefore.x,
          nodeAfter.y - nodeBefore.y
        )
        const followX = Math.abs(
          endpointAfter.x - endpointBefore.x - (nodeAfter.x - nodeBefore.x)
        )
        const followY = Math.abs(
          endpointAfter.y - endpointBefore.y - (nodeAfter.y - nodeBefore.y)
        )
        return nodeMoved > 20 && followX < 12 && followY < 12
      },
      { message: "endpoint must follow the moved node" }
    )
    .toBe(true)

  // A pure move leaves the exact {side, ratio} anchor untouched.
  if (anchorBefore !== null) {
    expect(await targetAnchorOf(page, edgeId)).toEqual(anchorBefore)
  }
}

async function expectEndpointCanRetargetToNode({
  page,
  fixture,
  edgeId,
  targetId,
  targetHandle = "left",
  targetRatio = { x: 0.05, y: 0.2 },
}: {
  page: Page
  fixture: Record<string, unknown>
  edgeId: string
  targetId: string
  targetHandle?: string
  targetRatio?: Pt
}) {
  await openFixtureInLocalEditor(page, fixture)
  await waitForCanvasReady(page)

  const edge = await selectEdge(page, edgeId)
  const endpointHandle = edge.locator(".edge-endpoint-handle--target")
  await expect(endpointHandle).toBeVisible()

  const endpointBox = await endpointHandle.boundingBox()
  if (!endpointBox) throw new Error("target endpoint has no bounding box")

  const targetNode = page.locator(`.react-flow__node[data-id="${targetId}"]`)
  const targetBox = await targetNode.boundingBox()
  if (!targetBox) throw new Error("target node has no bounding box")

  await page.mouse.move(
    endpointBox.x + endpointBox.width / 2,
    endpointBox.y + endpointBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    targetBox.x + targetBox.width * targetRatio.x,
    targetBox.y + targetBox.height * targetRatio.y,
    { steps: 12 }
  )
  await page.mouse.up()

  // Poll the persisted edge until the retarget commits, rather than sleeping and
  // reading a one-shot snapshot that could race the commit.
  await expect
    .poll(
      async () =>
        (await storedEdges(page)).find((edge) => edge.id === edgeId)?.target
    )
    .toBe(targetId)

  const edgeState = (await storedEdges(page)).find((edge) => edge.id === edgeId)
  expect(edgeState).toMatchObject({ target: targetId, targetHandle })
  expect(edgeState?.data).toHaveProperty("targetAnchor")
}

// Following is diagram-agnostic — the stored {side, ratio} anchor is
// mode-independent — so one representative shape per distinct code path covers
// it rather than one per diagram type: step vs direct edge, rect / ellipse /
// four-center anchor, and a top-level vs parent-pinned target node.
const cases = [
  // step edge, rect anchor, top-level target.
  {
    name: "ClassDiagram",
    fixture: classFixture,
    edgeId: "231f7ef5-b43d-4187-8996-f7726ed6e919",
    targetId: "32659cdc-bd03-46f3-918c-ee8dbba9c15b",
  },
  // direct edge, ellipse anchor.
  {
    name: "UseCaseDiagram",
    fixture: useCaseFixture,
    edgeId: "edge-assoc-customer-browse",
    targetId: "880e8400-e29b-41d4-a716-446655440033",
  },
  // direct edge, rect anchor.
  {
    name: "SyntaxTree",
    fixture: syntaxTreeFixture,
    edgeId: "edge-expr-term-left",
    targetId: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b",
  },
  // four-center anchor on a parent-pinned interface (moved via its parent).
  {
    name: "ComponentDiagram required interface",
    fixture: componentFixture,
    edgeId: "edge-server-interface",
    targetId: "1b4e28ba-2fa1-4d11-a2d3-b8f04f4e5c6d",
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

test("a dragged required-interface socket follows its tip and restores its gap when snapped", async ({
  page,
}) => {
  const edgeId = "edge-server-interface"
  const interfaceId = "1b4e28ba-2fa1-4d11-a2d3-b8f04f4e5c6d"
  await openFixtureInLocalEditor(page, componentFixture)
  await waitForCanvasReady(page)

  const edge = await selectEdge(page, edgeId)
  const endpointHandle = edge.locator(".edge-endpoint-handle--target")
  const endpointBox = await endpointHandle.boundingBox()
  if (!endpointBox) throw new Error("target endpoint has no bounding box")

  const measureJoin = () =>
    page.evaluate(
      ({ edgeId, interfaceId }) => {
        const edgeGroup = document.querySelector(
          `.react-flow__edge[data-id="${edgeId}"]`
        )
        const edgePath = edgeGroup?.querySelector(
          ".react-flow__edge-path"
        ) as SVGPathElement | null
        const markerPath = edgeGroup?.querySelector(
          "[data-inline-marker]"
        ) as SVGPathElement | null
        const circle = document.querySelector(
          `.react-flow__node[data-id="${interfaceId}"] circle`
        ) as SVGCircleElement | null
        if (!edgePath || !markerPath || !circle)
          throw new Error("missing required-interface geometry")

        const screenPoint = (
          path: SVGPathElement,
          distance: number
        ): DOMPoint => {
          const matrix = path.getScreenCTM()
          if (!matrix) throw new Error("missing path transform")
          const point = path.getPointAtLength(distance)
          return new DOMPoint(point.x, point.y).matrixTransform(matrix)
        }
        const edgeEnd = screenPoint(edgePath, edgePath.getTotalLength())
        // The required arc is symmetric around its line/socket contact, so its
        // arc-length midpoint is that exact contact for every orientation.
        const socketContact = screenPoint(
          markerPath,
          markerPath.getTotalLength() / 2
        )
        const circleMatrix = circle.getScreenCTM()
        if (!circleMatrix) throw new Error("missing circle transform")
        const circleCenter = new DOMPoint(
          circle.cx.baseVal.value,
          circle.cy.baseVal.value
        ).matrixTransform(circleMatrix)
        const scale = Math.hypot(circleMatrix.a, circleMatrix.b)
        const circleRadius = circle.r.baseVal.value * scale

        return {
          lineToSocket: Math.hypot(
            edgeEnd.x - socketContact.x,
            edgeEnd.y - socketContact.y
          ),
          socketGap:
            (Math.hypot(
              socketContact.x - circleCenter.x,
              socketContact.y - circleCenter.y
            ) -
              circleRadius) /
            scale,
        }
      },
      { edgeId, interfaceId }
    )

  const start = {
    x: endpointBox.x + endpointBox.width / 2,
    y: endpointBox.y + endpointBox.height / 2,
  }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 140, start.y - 120, { steps: 10 })

  await expect
    .poll(async () => (await measureJoin()).lineToSocket)
    .toBeLessThan(0.75)

  const interfaceNode = page.locator(
    `.react-flow__node[data-id="${interfaceId}"]`
  )
  const interfaceBox = await interfaceNode.boundingBox()
  if (!interfaceBox) throw new Error("interface node has no bounding box")
  await page.mouse.move(
    interfaceBox.x + interfaceBox.width / 2,
    interfaceBox.y + interfaceBox.height / 2,
    { steps: 10 }
  )

  await expect
    .poll(async () => (await measureJoin()).lineToSocket)
    .toBeLessThan(0.75)
  await expect
    .poll(async () => (await measureJoin()).socketGap)
    .toBeCloseTo(4, 1)
  await page.mouse.up()
})

test("a freeform ComponentDiagram endpoint can retarget to a component subsystem", async ({
  page,
}) => {
  await expectEndpointCanRetargetToNode({
    page,
    fixture: componentFixture,
    edgeId: "edge-server-database",
    targetId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    targetRatio: { x: 0.03, y: 0.12 },
  })
})

test("a freeform DeploymentDiagram endpoint can retarget to a deployment node", async ({
  page,
}) => {
  await expectEndpointCanRetargetToNode({
    page,
    fixture: deploymentFixture,
    edgeId: "edge-appcontainer-interface",
    targetId: "a7b8c9d0-e1f2-4a3b-4c5d-6e7f80910213",
    targetRatio: { x: 0.05, y: 0.2 },
  })
})

test("a freeform DeploymentDiagram endpoint can retarget to a deployment component", async ({
  page,
}) => {
  await expectEndpointCanRetargetToNode({
    page,
    fixture: deploymentFixture,
    edgeId: "edge-appcontainer-interface",
    targetId: "b8c9d0e1-f2a3-4b4c-5d6e-7f8091021324",
    targetRatio: { x: 0.08, y: 0.25 },
  })
})

test("a new same-node edge can connect different handles", async ({ page }) => {
  await openFixtureInLocalEditor(page, classNoEdgeFixture)
  await waitForCanvasReady(page)

  const node = page.locator(`.react-flow__node[data-id="${CLASS_SOURCE}"]`)
  const nodeBox = await node.boundingBox()
  if (!nodeBox) throw new Error("source node has no bounding box")

  await node.hover()
  await page.waitForTimeout(120)
  const rightHandle = node.locator('.react-flow__handle[data-handleid="right"]')
  const handleBox = await rightHandle.first().boundingBox()
  if (!handleBox) throw new Error("source handle has no bounding box")

  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + 4, {
    steps: 12,
  })
  await page.mouse.up()

  await expect.poll(async () => (await storedEdges(page)).length).toBe(1)

  const edges = await storedEdges(page)
  expect(edges[0]).toMatchObject({
    source: CLASS_SOURCE,
    target: CLASS_SOURCE,
    sourceHandle: "right",
    targetHandle: "top",
  })
})

test("a new same-node edge cannot reconnect to the same handle", async ({
  page,
}) => {
  await openFixtureInLocalEditor(page, classNoEdgeFixture)
  await waitForCanvasReady(page)

  const node = page.locator(`.react-flow__node[data-id="${CLASS_SOURCE}"]`)

  await node.hover()
  await page.waitForTimeout(120)
  const rightHandle = node.locator('.react-flow__handle[data-handleid="right"]')
  const handleBox = await rightHandle.first().boundingBox()
  if (!handleBox) throw new Error("source handle has no bounding box")

  const x = handleBox.x + handleBox.width / 2
  const y = handleBox.y + handleBox.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 16, y, { steps: 4 })
  await page.mouse.move(x, y, { steps: 4 })
  await page.mouse.up()
  await page.waitForTimeout(400)

  expect(await storedEdges(page)).toHaveLength(0)
})
