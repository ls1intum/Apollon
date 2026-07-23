import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import {
  waitForCanvasReady,
  injectFixtureIntoLocalStorage,
  clickFitView,
  createTemplateInLocalEditor,
  openNewDiagramDialog,
  selectEdgeOnPath,
} from "../helpers/canvas"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Visual regression tests for the Apollon UML diagram editor.
 *
 * Each test injects a fixture UMLModel into localStorage (via addInitScript)
 * so that Zustand's persist store hydrates with a real diagram before the
 * page JS runs. This guarantees every screenshot contains actual rendered
 * nodes and edges, not empty canvases.
 *
 * On the first run use `--update-snapshots` to generate baseline images:
 *
 *   npx playwright test tests/visual/ --update-snapshots
 */

// ---------------------------------------------------------------------------
// Load fixture files
// ---------------------------------------------------------------------------

const fixturesDir = path.join(__dirname, "..", "fixtures")

function loadFixture(filename: string): Record<string, unknown> {
  const raw = fs.readFileSync(path.join(fixturesDir, filename), "utf-8")
  return JSON.parse(raw) as Record<string, unknown>
}

function pathPoints(d: string | null): { x: number; y: number }[] {
  if (!d) return []
  return [...d.matchAll(/[ML]\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/g)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }))
}

function pathBendCount(d: string | null): number {
  const points = pathPoints(d)
  if (points.length < 2) return Number.POSITIVE_INFINITY
  let bends = 0
  for (let index = 1; index < points.length - 1; index++) {
    const before = points[index - 1]
    const current = points[index]
    const after = points[index + 1]
    if (
      (before.x === current.x) !== (current.x === after.x) ||
      (before.y === current.y) !== (current.y === after.y)
    )
      bends++
  }
  return bends
}

const REQUIRED_INTERFACE_TYPES = new Set([
  "ComponentRequiredInterface",
  "DeploymentRequiredInterface",
  "ComponentRequiredQuarterInterface",
  "DeploymentRequiredQuarterInterface",
  "ComponentRequiredThreeQuarterInterface",
  "DeploymentRequiredThreeQuarterInterface",
])
const STANDARD_REQUIRED_INTERFACE_ARC_RADIANS = (165 * Math.PI) / 180

/**
 * Whole-editor screenshots intentionally tolerate a small amount of
 * anti-aliasing noise. A required-interface socket occupies too few pixels for
 * that threshold to protect its topology, so assert its SVG geometry exactly:
 * the relationship must join the arc, and each socket variant must keep
 * its intended angular span.
 */
async function expectRequiredInterfaceGeometry(
  page: Page,
  fixture: Record<string, unknown>,
  expectedArcByEdgeId?: Readonly<Record<string, number>>
) {
  const edges = (fixture.edges ?? []) as Array<{
    id: string
    type: string
    target: string
  }>
  const requiredEdges = edges.filter((edge) =>
    REQUIRED_INTERFACE_TYPES.has(edge.type)
  )

  for (const edge of requiredEdges) {
    const geometry = await page
      .locator(`.react-flow__edge[data-id="${edge.id}"]`)
      .evaluate((element) => {
        const line = element.querySelector<SVGPathElement>(
          "path.react-flow__edge-path"
        )
        const socket = element.querySelector<SVGPathElement>(
          'path[data-inline-marker="true"]'
        )
        if (!line || !socket)
          throw new Error("required socket paths are absent")

        const lineEnd = line.getPointAtLength(line.getTotalLength())
        const socketLength = socket.getTotalLength()
        let minimumGap = Number.POSITIVE_INFINITY
        for (let sample = 0; sample <= 720; sample++) {
          const point = socket.getPointAtLength((socketLength * sample) / 720)
          minimumGap = Math.min(
            minimumGap,
            Math.hypot(point.x - lineEnd.x, point.y - lineEnd.y)
          )
        }
        const radiusMatch = socket.getAttribute("d")?.match(/A([\d.]+),/)
        if (!radiusMatch) throw new Error("required socket radius is absent")

        return {
          minimumGap,
          arcRadians: socketLength / Number(radiusMatch[1]),
        }
      })

    expect(geometry.minimumGap).toBeCloseTo(0, 1)
    const explicitExpectedArc = expectedArcByEdgeId?.[edge.id]
    if (explicitExpectedArc === undefined) {
      // Every interface in the canonical fixtures has one required edge. Its
      // rendered marker must therefore be the embracing standard socket even
      // when an older fixture persisted a reduced marker variant.
      expect(
        requiredEdges.filter((candidate) => candidate.target === edge.target)
      ).toHaveLength(1)
    }
    expect(geometry.arcRadians).toBeCloseTo(
      explicitExpectedArc ?? STANDARD_REQUIRED_INTERFACE_ARC_RADIANS,
      2
    )
  }
}

async function expectProvidedInterfaceClearsRequiredSockets(
  page: Page,
  providedEdgeId: string,
  requiredEdgeIds: readonly string[]
) {
  const clearance = await page.evaluate(
    ({ providedEdgeId, requiredEdgeIds }) => {
      const edgePath = (edgeId: string) =>
        document.querySelector<SVGPathElement>(
          `.react-flow__edge[data-id="${edgeId}"] path.react-flow__edge-path`
        )
      const provided = edgePath(providedEdgeId)
      const sockets = requiredEdgeIds.map((edgeId) =>
        document.querySelector<SVGPathElement>(
          `.react-flow__edge[data-id="${edgeId}"] path[data-inline-marker="true"]`
        )
      )
      if (!provided || sockets.some((socket) => socket === null))
        throw new Error("provided/required interface paths are absent")

      const sample = (path: SVGPathElement, count: number) =>
        Array.from({ length: count + 1 }, (_, index) =>
          path.getPointAtLength((path.getTotalLength() * index) / count)
        )
      const providedPoints = sample(provided, 360)
      const socketPoints = (sockets as SVGPathElement[]).map((socket) =>
        sample(socket, 720)
      )
      let minimumDistance = Number.POSITIVE_INFINITY
      for (const points of socketPoints) {
        for (const edgePoint of providedPoints) {
          for (const socketPoint of points) {
            minimumDistance = Math.min(
              minimumDistance,
              Math.hypot(
                edgePoint.x - socketPoint.x,
                edgePoint.y - socketPoint.y
              )
            )
          }
        }
      }

      return {
        minimumDistance,
        providedHalfStroke:
          Number.parseFloat(getComputedStyle(provided).strokeWidth) / 2,
      }
    },
    { providedEdgeId, requiredEdgeIds }
  )

  // The required arcs use butt caps, so clearing the provided line's
  // half-stroke is the exact non-intersection condition at their seam.
  expect(clearance.minimumDistance).toBeGreaterThan(
    clearance.providedHalfStroke
  )
}

// All 13 diagram fixtures with human-readable name + kebab-case file slug.
// `fitView: true` triggers the ReactFlow fit-view button so the full diagram
// is visible — needed for diagrams that overflow the viewport at zoom 1.0.
const diagramFixtures = [
  {
    name: "ClassDiagram",
    file: "class-diagram",
    fixture: loadFixture("class-diagram.json"),
  },
  {
    name: "ObjectDiagram",
    file: "object-diagram",
    fixture: loadFixture("object-diagram.json"),
  },
  {
    name: "ActivityDiagram",
    file: "activity-diagram",
    fixture: loadFixture("activity-diagram.json"),
  },
  {
    name: "UseCaseDiagram",
    file: "use-case-diagram",
    fixture: loadFixture("use-case-diagram.json"),
  },
  {
    name: "CommunicationDiagram",
    file: "communication-diagram",
    fixture: loadFixture("communication-diagram.json"),
  },
  {
    name: "ComponentDiagram",
    file: "component-diagram",
    fixture: loadFixture("component-diagram.json"),
  },
  {
    name: "DeploymentDiagram",
    file: "deployment-diagram",
    fixture: loadFixture("deployment-diagram.json"),
  },
  {
    name: "PetriNet",
    file: "petri-net",
    fixture: loadFixture("petri-net.json"),
  },
  {
    name: "ReachabilityGraph",
    file: "reachability-graph",
    fixture: loadFixture("reachability-graph.json"),
  },
  {
    name: "SyntaxTree",
    file: "syntax-tree",
    fixture: loadFixture("syntax-tree.json"),
  },
  {
    name: "Flowchart",
    file: "flowchart",
    fixture: loadFixture("flowchart.json"),
  },
  {
    name: "BPMN",
    file: "bpmn",
    fixture: loadFixture("bpmn.json"),
    fitView: true,
  },
  { name: "Sfc", file: "sfc", fixture: loadFixture("sfc.json") },
]

// Helpers imported from ../helpers/canvas

// ---------------------------------------------------------------------------
// 1. Fixture-based diagram tests (all 13 diagram types)
// ---------------------------------------------------------------------------

test.describe("Visual regression - diagram fixtures", () => {
  for (const { name, file, fixture, fitView } of diagramFixtures) {
    test(`canvas for ${name}`, async ({ page }) => {
      await injectFixtureIntoLocalStorage(page, fixture)
      await page.goto(resolveLocalDiagramRoute(fixture))
      await waitForCanvasReady(page)

      // For large diagrams that overflow at zoom 1.0, click the built-in
      // ReactFlow fit-view button so the full diagram is captured.
      if (fitView) {
        await clickFitView(page)
      }

      if (name === "ComponentDiagram" || name === "DeploymentDiagram") {
        await expectRequiredInterfaceGeometry(page, fixture)
      }

      // Screenshot the editor area (sidebar + canvas). The header floats inside
      // the canvas, so mask it — visual diffs stay focused on diagram rendering,
      // not unrelated UI chrome. Baselines MUST be generated inside the
      // Playwright Docker container (see
      // docs/contributor/development/visual-tests.md) so they match CI exactly.
      const editorArea = page.locator('[data-testid="editor-area"]')
      await expect(editorArea).toHaveScreenshot(`visual-${file}.png`, {
        mask: [page.locator("header")],
      })
    })
  }
})

const requiredInterfaceCombinationFixture = (
  id: string,
  lowerComponentPosition: { x: number; y: number }
) => ({
  id,
  version: "4.1.0",
  title: "",
  type: "ComponentDiagram",
  nodes: [
    {
      id: `${id}-upper`,
      width: 180,
      height: 120,
      type: "component",
      position: { x: 520, y: 210 },
      data: { name: "Component", isComponentHeaderShown: true },
      measured: { width: 180, height: 120 },
    },
    {
      id: `${id}-lower`,
      width: 180,
      height: 120,
      type: "component",
      position: lowerComponentPosition,
      data: { name: "Component", isComponentHeaderShown: true },
      measured: { width: 180, height: 120 },
    },
    {
      id: `${id}-interface`,
      width: 30,
      height: 30,
      type: "componentInterface",
      position: { x: 580, y: 420 },
      data: { name: "Interface" },
      measured: { width: 30, height: 30 },
    },
  ],
  edges: [
    {
      id: `${id}-side`,
      source: `${id}-lower`,
      target: `${id}-interface`,
      type: "ComponentRequiredInterface",
      sourceHandle: "right",
      targetHandle: "left",
      data: { points: [] },
    },
    {
      id: `${id}-top`,
      source: `${id}-upper`,
      target: `${id}-interface`,
      type: "ComponentRequiredInterface",
      sourceHandle: "top-mid-left",
      targetHandle: "top",
      data: { points: [] },
    },
  ],
  assessments: {},
})

const requiredInterfaceWithProvidedFixture = (() => {
  const fixture = requiredInterfaceCombinationFixture("socket-provided", {
    x: 485,
    y: 545,
  })
  return {
    ...fixture,
    nodes: [
      ...fixture.nodes,
      {
        id: "socket-provided-subsystem",
        width: 180,
        height: 120,
        type: "componentSubsystem",
        position: { x: 725, y: 365 },
        data: { name: "Subsystem", isComponentSubsystemHeaderShown: true },
        measured: { width: 180, height: 120 },
      },
    ],
    edges: [
      ...fixture.edges,
      {
        id: "socket-provided-line",
        source: "socket-provided-subsystem",
        target: "socket-provided-interface",
        type: "ComponentProvidedInterface",
        sourceHandle: "left",
        targetHandle: "right",
        data: {
          points: [
            { x: 725, y: 435 },
            { x: 610, y: 435 },
          ],
          sourceAnchor: { side: "left", ratio: 7 / 12 },
          targetAnchor: { side: "right", ratio: 0.5 },
        },
      },
    ],
  }
})()

test.describe("Required interface socket combinations", () => {
  const cases = [
    {
      name: "opposite routed sides use embracing sockets",
      fixture: requiredInterfaceCombinationFixture("socket-opposite", {
        x: 465,
        y: 500,
      }),
      expectedArc: STANDARD_REQUIRED_INTERFACE_ARC_RADIANS,
    },
    {
      name: "adjacent routed sides use separated quarter sockets",
      fixture: requiredInterfaceCombinationFixture("socket-adjacent", {
        x: 320,
        y: 390,
      }),
      expectedArc: (85 * Math.PI) / 180,
    },
  ]

  for (const { name, fixture, expectedArc } of cases) {
    test(name, async ({ page }) => {
      await injectFixtureIntoLocalStorage(page, fixture)
      await page.goto(resolveLocalDiagramRoute(fixture))
      await waitForCanvasReady(page)
      await expectRequiredInterfaceGeometry(page, fixture, {
        [`${fixture.id}-side`]: expectedArc,
        [`${fixture.id}-top`]: expectedArc,
      })
    })
  }

  test("a detached reduced socket uses the canonical 165-degree marker", async ({
    page,
  }) => {
    const fixture = requiredInterfaceCombinationFixture("socket-detached", {
      x: 320,
      y: 390,
    })
    const sideEdgeId = `${fixture.id}-side`
    const topEdgeId = `${fixture.id}-top`
    const quarterArc = (85 * Math.PI) / 180
    await injectFixtureIntoLocalStorage(page, fixture)
    await page.goto(resolveLocalDiagramRoute(fixture))
    await waitForCanvasReady(page)
    await expectRequiredInterfaceGeometry(page, fixture, {
      [sideEdgeId]: quarterArc,
      [topEdgeId]: quarterArc,
    })

    await selectEdgeOnPath(page, sideEdgeId)
    const targetHandle = page.locator(
      `.react-flow__edge[data-id="${sideEdgeId}"] .edge-endpoint-handle--target`
    )
    await expect(targetHandle).toBeVisible()
    const handleBox = await targetHandle.boundingBox()
    if (!handleBox) throw new Error("required endpoint handle is absent")

    const start = {
      x: handleBox.x + handleBox.width / 2,
      y: handleBox.y + handleBox.height / 2,
    }
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 200, start.y + 160, { steps: 12 })

    // Only the detached edge loses its interface-bundle context. Its sibling
    // remains a reduced socket around the still-connected interface.
    await expectRequiredInterfaceGeometry(page, fixture, {
      [sideEdgeId]: STANDARD_REQUIRED_INTERFACE_ARC_RADIANS,
      [topEdgeId]: quarterArc,
    })

    await page.mouse.up()
    await expectRequiredInterfaceGeometry(page, fixture, {
      [sideEdgeId]: quarterArc,
      [topEdgeId]: quarterArc,
    })
  })

  test("a provided edge passes cleanly through the seam between required sockets", async ({
    page,
  }) => {
    const fixture = requiredInterfaceWithProvidedFixture
    await injectFixtureIntoLocalStorage(page, fixture)
    await page.goto(resolveLocalDiagramRoute(fixture))
    await waitForCanvasReady(page)
    const requiredEdgeIds = [
      "socket-provided-side",
      "socket-provided-top",
    ] as const
    await expectRequiredInterfaceGeometry(page, fixture, {
      [requiredEdgeIds[0]]: STANDARD_REQUIRED_INTERFACE_ARC_RADIANS,
      [requiredEdgeIds[1]]: STANDARD_REQUIRED_INTERFACE_ARC_RADIANS,
    })
    await expectProvidedInterfaceClearsRequiredSockets(
      page,
      "socket-provided-line",
      requiredEdgeIds
    )
  })
})

// ---------------------------------------------------------------------------
// 2. Template diagrams – GoF presets created through the user-facing workflow
// ---------------------------------------------------------------------------

function resolveLocalDiagramRoute(fixture: Record<string, unknown>) {
  const id = fixture.id
  if (typeof id !== "string" || !id) {
    throw new Error("Fixture is missing a valid 'id' for /local/:id navigation")
  }
  return `/local/${id}`
}

const templateDiagrams = [
  { name: "Adapter", routing: { automatic: 1, pinned: 2 } },
  { name: "Bridge", routing: { automatic: 2, pinned: 4 } },
  { name: "Command", routing: { automatic: 5, pinned: 1 } },
  { name: "Observer", routing: { automatic: 1, pinned: 2 } },
  { name: "Factory", routing: { automatic: 1, pinned: 3 } },
] as const

test.describe("Template diagrams", () => {
  // Thumbnail generation and the lazy editor route do real work; keep this
  // user-workflow regression explicit rather than relying on the generic 30s
  // timeout under a fully parallel visual run.
  test.describe.configure({ timeout: 60_000 })

  for (const { name, routing } of templateDiagrams) {
    test(`${name} template canvas matches baseline`, async ({ page }) => {
      const created = await createTemplateInLocalEditor(page, name)
      expect(created?.title).toBe(name)
      expect(created?.id).toBe(page.url().split("/").at(-1))

      const nodes = created?.nodes as Array<Record<string, unknown>>
      const edges = created?.edges as Array<{
        data?: {
          points?: unknown[]
          sourceAnchor?: unknown
          targetAnchor?: unknown
        }
      }>
      expect(nodes.length).toBeGreaterThan(0)
      expect(edges.length).toBeGreaterThan(0)
      expect(
        nodes.every(
          (node) =>
            !("selected" in node) &&
            !("dragging" in node) &&
            !("resizing" in node)
        )
      ).toBe(true)
      expect(edges.every((edge) => edge.data?.points?.length === 0)).toBe(true)
      const pinned = edges.filter(
        (edge) =>
          edge.data?.sourceAnchor != null || edge.data?.targetAnchor != null
      )
      expect(pinned).toHaveLength(routing.pinned)
      expect(edges.length - pinned.length).toBe(routing.automatic)
      await expect(page.locator(".react-flow__edge")).toHaveCount(edges.length)
      if (name === "Bridge") {
        const clientAssociation =
          "xy-edge__286257b1-ebd3-424f-b3e4-c1c2a722531bright-2eb1ceb2-266e-4669-89f1-c61e246cb10cleft"
        await expect
          .poll(async () =>
            pathBendCount(
              await page
                .locator(
                  `.react-flow__edge[data-id="${clientAssociation}"] .react-flow__edge-path`
                )
                .first()
                .getAttribute("d")
            )
          )
          .toBe(0)
      }
      if (name === "Factory" || name === "Adapter") {
        const outerInheritance =
          name === "Factory"
            ? "1737998332817-8a30926e-581b-49c9-b0cc-7a9119ae1579-1c0330be-83dd-4d92-9bd1-d62a36e90c7b"
            : "1737993042486-7052e703-263f-4df5-95e0-3558793849af-2eb1ceb2-266e-4669-89f1-c61e246cb10c"
        const expectedBusY = name === "Factory" ? 280 : 230
        await expect
          .poll(async () =>
            pathPoints(
              await page
                .locator(
                  `.react-flow__edge[data-id="${outerInheritance}"] .react-flow__edge-path`
                )
                .first()
                .getAttribute("d")
            ).slice(1, -1)
          )
          .toEqual(
            name === "Factory"
              ? [
                  { x: 140, y: expectedBusY },
                  { x: 390, y: expectedBusY },
                ]
              : [
                  { x: 275, y: expectedBusY },
                  { x: 365, y: expectedBusY },
                ]
          )
      }

      // Initial React Flow fitting can legitimately land at 97% or 100% while
      // node measurements arrive. The user-facing Fit view command is
      // inset-aware and deterministic, frames every preset clear of the
      // palette/header, and keeps the screenshot about template geometry
      // rather than mount timing.
      await clickFitView(page)

      const editorArea = page.locator('[data-testid="editor-area"]')
      await expect(editorArea).toHaveScreenshot(
        `template-${name.toLowerCase()}.png`
      )
    })
  }
})

// ---------------------------------------------------------------------------
// 3. Template picker previews – the actual preset images users choose from
// ---------------------------------------------------------------------------

async function openTemplatePicker(
  page: import("@playwright/test").Page,
  theme: "light" | "dark"
) {
  await page.emulateMedia({ colorScheme: theme })
  await page.addInitScript(
    ({ persistedTheme }) => {
      localStorage.setItem(
        "persistenceModelStore",
        JSON.stringify({
          state: { models: {}, currentModelId: null },
          version: 3,
        })
      )
      localStorage.setItem("apollon-theme", persistedTheme)
    },
    {
      persistedTheme: JSON.stringify({
        state: {
          systemThemePreference: theme,
          userThemePreference: theme,
          currentTheme: theme,
        },
        version: 2,
      }),
    }
  )

  await page.goto("/")
  const dialog = await openNewDiagramDialog(page)
  await dialog.getByRole("tab", { name: "Use template" }).click()

  await page.waitForFunction(() => {
    const light = [
      ...document.querySelectorAll<HTMLImageElement>(
        "img.theme-thumbnail-light"
      ),
    ]
    const dark = [
      ...document.querySelectorAll<HTMLImageElement>(
        "img.theme-thumbnail-dark"
      ),
    ]
    return (
      light.length === 5 &&
      dark.length === 5 &&
      [...light, ...dark].every(
        (image) => image.complete && image.naturalWidth > 0
      )
    )
  })
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
  })
  return dialog
}

test.describe("Template picker previews", () => {
  test.describe.configure({ timeout: 60_000 })

  for (const theme of ["light", "dark"] as const) {
    test(`all preset cards are balanced in ${theme} mode`, async ({ page }) => {
      const dialog = await openTemplatePicker(page, theme)

      for (const { name } of templateDiagrams) {
        const card = dialog.getByRole("button", { name, exact: true })
        await expect(card).toHaveScreenshot(
          `template-picker-${name.toLowerCase()}-${theme}.png`
        )
      }
    })
  }
})

// ---------------------------------------------------------------------------
// 4. Routing authority – keep automatic, pinned and authored states distinct
// ---------------------------------------------------------------------------

const routingAuthorityFixtures = [
  {
    name: "pinned-endpoints",
    fixture: loadFixture("edge-pinned-anchors.json") as Record<
      string,
      unknown
    > & { edges: { id: string }[] },
    minimumBendHandles: 1,
  },
  {
    name: "authored-bends",
    fixture: loadFixture("edge-manual-bends-multi-corner.json") as Record<
      string,
      unknown
    > & { edges: { id: string }[] },
    minimumBendHandles: 4,
  },
]

test.describe("Routing authority states", () => {
  for (const {
    name,
    fixture,
    minimumBendHandles,
  } of routingAuthorityFixtures) {
    test(`${name} remains editable`, async ({ page }) => {
      await injectFixtureIntoLocalStorage(page, fixture)
      await page.goto(resolveLocalDiagramRoute(fixture))
      await waitForCanvasReady(page)
      await clickFitView(page)

      const edgeId = fixture.edges[0].id
      await selectEdgeOnPath(page, edgeId)
      const edge = page.locator(`.react-flow__edge[data-id="${edgeId}"]`)

      expect(
        await edge.locator(".edge-bend-handle").count()
      ).toBeGreaterThanOrEqual(minimumBendHandles)
      await expect(
        page.getByRole("button", { name: "Reset routing" })
      ).toBeVisible()

      const editorArea = page.locator('[data-testid="editor-area"]')
      await expect(editorArea).toHaveScreenshot(`routing-${name}.png`)
    })
  }
})
