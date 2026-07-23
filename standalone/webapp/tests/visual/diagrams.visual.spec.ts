import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import {
  waitForCanvasReady,
  injectFixtureIntoLocalStorage,
  clickFitView,
  createTemplateInLocalEditor,
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
  await page.getByRole("button", { name: "New diagram" }).first().click()
  const dialog = page.getByRole("dialog")
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
  await page.waitForTimeout(200)
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
          `template-picker-${name.toLowerCase()}-${theme}.png`,
          { maxDiffPixels: 250 }
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
    pinnedGrips: 2,
    minimumBendHandles: 1,
  },
  {
    name: "authored-bends",
    fixture: loadFixture("edge-manual-bends-multi-corner.json") as Record<
      string,
      unknown
    > & { edges: { id: string }[] },
    pinnedGrips: 0,
    minimumBendHandles: 4,
  },
]

test.describe("Routing authority states", () => {
  for (const {
    name,
    fixture,
    pinnedGrips,
    minimumBendHandles,
  } of routingAuthorityFixtures) {
    test(`${name} remains visually explicit`, async ({ page }) => {
      await injectFixtureIntoLocalStorage(page, fixture)
      await page.goto(resolveLocalDiagramRoute(fixture))
      await waitForCanvasReady(page)
      await clickFitView(page)

      const edgeId = fixture.edges[0].id
      await selectEdgeOnPath(page, edgeId)
      const edge = page.locator(`.react-flow__edge[data-id="${edgeId}"]`)

      await expect(edge.locator(".edge-endpoint-grip--pinned")).toHaveCount(
        pinnedGrips
      )
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
