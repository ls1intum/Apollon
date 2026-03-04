import { test, expect, type Page } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Visual regression tests for the Apollon2 UML diagram editor.
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

// All 13 diagram fixtures with human-readable name + kebab-case file slug.
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
  { name: "BPMN", file: "bpmn", fixture: loadFixture("bpmn.json") },
  { name: "Sfc", file: "sfc", fixture: loadFixture("sfc.json") },
] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wait until the React Flow canvas is fully rendered.
 * @param expectNodes - if true, also waits for at least one .react-flow__node
 */
async function waitForCanvasReady(page: Page, expectNodes = true) {
  // 1. React Flow container is visible
  await page
    .locator(".react-flow")
    .first()
    .waitFor({ state: "visible", timeout: 15_000 })

  // 2. Viewport layer is attached
  await page
    .locator(".react-flow__viewport")
    .first()
    .waitFor({ state: "attached", timeout: 10_000 })

  // 3. At least one node is rendered and visible (when expected)
  if (expectNodes) {
    await page
      .locator(".react-flow__node")
      .first()
      .waitFor({ state: "visible", timeout: 15_000 })
  }

  // 4. Let layout and paint settle
  await page.waitForTimeout(500)
}

/**
 * Inject a UMLModel fixture into localStorage so Zustand hydrates with it.
 * Must be called BEFORE navigation (page.goto).
 */
async function injectFixtureIntoLocalStorage(
  page: Page,
  fixture: Record<string, unknown>
) {
  const modelId = fixture.id as string
  const storeValue = JSON.stringify({
    state: {
      models: {
        [modelId]: {
          id: modelId,
          model: fixture,
          lastModifiedAt: new Date().toISOString(),
        },
      },
      currentModelId: modelId,
    },
    version: 0,
  })

  await page.addInitScript((val) => {
    localStorage.setItem("persistenceModelStore", val)
  }, storeValue)
}

// ---------------------------------------------------------------------------
// 1. Fixture-based diagram tests (all 13 diagram types)
// ---------------------------------------------------------------------------

test.describe("Visual regression - diagram fixtures", () => {
  for (const { name, file, fixture } of diagramFixtures) {
    test(`canvas for ${name}`, async ({ page }) => {
      await injectFixtureIntoLocalStorage(page, fixture)
      await page.goto("/")
      await waitForCanvasReady(page)

      const canvas = page.locator(".react-flow").first()
      await expect(canvas).toHaveScreenshot(`visual-${file}.png`)
    })
  }
})

// ---------------------------------------------------------------------------
// 2. Template diagram - verifies loading via the UI (Adapter pattern)
// ---------------------------------------------------------------------------

test.describe("Template diagram", () => {
  test("Adapter template canvas matches baseline", async ({ page }) => {
    await page.goto("/")
    await waitForCanvasReady(page, false) // No nodes yet on empty canvas

    // Open the File menu, then "Start from Template"
    await page.locator("#file-menu-button").first().click()
    await page.getByText("Start from Template").click()

    // The modal should show the Adapter template selected by default.
    // Click "Create Diagram" to load it.
    await page.getByRole("button", { name: "Create Diagram" }).click()

    // Wait for the template to load into the canvas
    await waitForCanvasReady(page)
    await page.waitForTimeout(500)

    const canvas = page.locator(".react-flow").first()
    await expect(canvas).toHaveScreenshot("template-adapter.png")
  })
})
