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
const activityFixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "activity-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>
const bpmnFixture = JSON.parse(
  fs.readFileSync(path.join(__d, "..", "fixtures", "bpmn.json"), "utf-8")
) as Record<string, unknown>
const communicationFixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "communication-diagram.json"),
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
const flowchartFixture = JSON.parse(
  fs.readFileSync(path.join(__d, "..", "fixtures", "flowchart.json"), "utf-8")
) as Record<string, unknown>
const objectFixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "object-diagram.json"),
    "utf-8"
  )
) as Record<string, unknown>
const petriNetFixture = JSON.parse(
  fs.readFileSync(path.join(__d, "..", "fixtures", "petri-net.json"), "utf-8")
) as Record<string, unknown>
const reachabilityGraphFixture = JSON.parse(
  fs.readFileSync(
    path.join(__d, "..", "fixtures", "reachability-graph.json"),
    "utf-8"
  )
) as Record<string, unknown>
const sfcFixture = JSON.parse(
  fs.readFileSync(path.join(__d, "..", "fixtures", "sfc.json"), "utf-8")
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
  await page.waitForTimeout(150)
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
  await page.mouse.move(
    targetBox.x +
      Math.min(Math.max(targetBox.width * 0.15, 3), targetBox.width - 3),
    targetBox.y +
      Math.min(Math.max(targetBox.height * 0.25, 3), targetBox.height - 3),
    { steps: 12 }
  )
  await page.mouse.up()
  await page.waitForTimeout(400)

  const targetBefore = await centerOf(targetHandle)
  const nodeBefore = await centerOf(targetNode)

  await dragLocatorBy(page, targetNode, 90, 45)

  const targetAfter = await centerOf(targetHandle)
  const nodeAfter = await centerOf(targetNode)
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
  await page.waitForTimeout(400)

  const edgeState = (await storedEdges(page)).find((edge) => edge.id === edgeId)
  expect(edgeState).toMatchObject({ target: targetId, targetHandle })
  expect(edgeState?.data).toHaveProperty("targetAnchor")
}

const cases = [
  {
    name: "ClassDiagram",
    fixture: classFixture,
    edgeId: "231f7ef5-b43d-4187-8996-f7726ed6e919",
    targetId: "32659cdc-bd03-46f3-918c-ee8dbba9c15b",
  },
  {
    name: "ActivityDiagram",
    fixture: activityFixture,
    edgeId: "edge-flow-initial-process",
    targetId: "770e8400-e29b-41d4-a716-446655440021",
  },
  {
    name: "BPMNDiagram",
    fixture: bpmnFixture,
    edgeId: "edge-start-validate",
    targetId: "cc3d4e5f-a6b7-4c8d-9e0f-1a2b3c4d5e6f",
  },
  {
    name: "BPMNDiagram association flow",
    fixture: bpmnFixture,
    edgeId: "edge-annotation-validate",
    targetId: "cc3d4e5f-a6b7-4c8d-9e0f-1a2b3c4d5e6f",
  },
  {
    name: "BPMNDiagram data association flow",
    fixture: bpmnFixture,
    edgeId: "edge-payment-invoice",
    targetId: "d40e1f2a-b3c4-4d5e-6f7a-8b9c0d1e2f3a",
  },
  {
    name: "BPMNDiagram message flow",
    fixture: bpmnFixture,
    edgeId: "edge-subprocess-to-pool-task",
    targetId: "ee5f6a7b-c8d9-4e0f-1a2b-3c4d5e6f7a8b",
  },
  {
    name: "CommunicationDiagram",
    fixture: communicationFixture,
    edgeId: "edge-comm-client-server",
    targetId: "990e8400-e29b-41d4-a716-446655440041",
  },
  {
    name: "ComponentDiagram",
    fixture: componentFixture,
    edgeId: "edge-server-database",
    targetId: "a87ff679-a2f3-4e71-9bda-d16a21e1a2f3",
  },
  {
    name: "ComponentDiagram provided interface",
    fixture: componentFixture,
    edgeId: "edge-client-interface",
    targetId: "1b4e28ba-2fa1-4d11-a2d3-b8f04f4e5c6d",
  },
  {
    name: "ComponentDiagram required interface",
    fixture: componentFixture,
    edgeId: "edge-server-interface",
    targetId: "1b4e28ba-2fa1-4d11-a2d3-b8f04f4e5c6d",
  },
  {
    name: "ComponentDiagram three-quarter required interface",
    fixture: componentFixture,
    edgeId: "edge-three-quarter-interface",
    targetId: "c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e60",
  },
  {
    name: "ComponentDiagram quarter required interface",
    fixture: componentFixture,
    edgeId: "edge-quarter-interface",
    targetId: "c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e61",
  },
  {
    name: "DeploymentDiagram",
    fixture: deploymentFixture,
    edgeId: "377c3ef7-083e-42a3-acc3-89786f7f762f",
    targetId: "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f809102",
  },
  {
    name: "DeploymentDiagram association",
    fixture: deploymentFixture,
    edgeId: "9c143a9c-350d-4f90-bf2e-fa11b8809b25",
    targetId: "b8c9d0e1-f2a3-4b4c-5d6e-7f8091021324",
  },
  {
    name: "DeploymentDiagram provided interface",
    fixture: deploymentFixture,
    edgeId: "edge-deploy-provided",
    targetId: "int-prov-001",
  },
  {
    name: "DeploymentDiagram required interface",
    fixture: deploymentFixture,
    edgeId: "edge-deploy-required",
    targetId: "int-req-001",
  },
  {
    name: "DeploymentDiagram three-quarter required interface",
    fixture: deploymentFixture,
    edgeId: "edge-deploy-3q",
    targetId: "int-3q-001",
  },
  {
    name: "DeploymentDiagram quarter required interface",
    fixture: deploymentFixture,
    edgeId: "edge-deploy-q",
    targetId: "int-q-001",
  },
  {
    name: "Flowchart",
    fixture: flowchartFixture,
    edgeId: "edge-start-init",
    targetId: "20b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  },
  {
    name: "ObjectDiagram",
    fixture: objectFixture,
    edgeId: "edge-link-dog-owner",
    targetId: "660e8400-e29b-41d4-a716-446655440011",
  },
  {
    name: "PetriNet",
    fixture: petriNetFixture,
    edgeId: "edge-p1-t1",
    targetId: "22222222-2222-4222-a222-222222222222",
  },
  {
    name: "ReachabilityGraph",
    fixture: reachabilityGraphFixture,
    edgeId: "edge-200-110",
    targetId: "aaaa2222-bbbb-4ccc-dddd-eeee22222222",
  },
  {
    name: "SfcDiagram",
    fixture: sfcFixture,
    edgeId: "edge-step1-actiontable",
    targetId: "44dd5ee6-ff7a-4b8c-9d0e-1f2a3b4c5d6e",
  },
  {
    name: "SyntaxTree",
    fixture: syntaxTreeFixture,
    edgeId: "edge-expr-term-left",
    targetId: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b",
  },
  {
    name: "UseCaseDiagram",
    fixture: useCaseFixture,
    edgeId: "edge-assoc-customer-browse",
    targetId: "880e8400-e29b-41d4-a716-446655440033",
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
  await page.waitForTimeout(400)

  const edges = await storedEdges(page)
  expect(edges).toHaveLength(1)
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
