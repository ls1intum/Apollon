import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import {
  waitForCanvasReady,
  injectFixtureIntoLocalStorage,
} from "../helpers/canvas"

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

// Helpers imported from ../helpers/canvas

// ---------------------------------------------------------------------------
// 1. Fixture-based diagram tests (all 13 diagram types)
// ---------------------------------------------------------------------------

test.describe("Visual regression - diagram fixtures", () => {
  for (const { name, file, fixture } of diagramFixtures) {
    test(`canvas for ${name}`, async ({ page }) => {
      await injectFixtureIntoLocalStorage(page, fixture)
      await page.goto("/")
      await waitForCanvasReady(page)

      // Full-page screenshot captures the sidebar (draggable UML elements),
      // the navbar, and the React Flow canvas together — giving maximum
      // visual regression coverage.
      await expect(page).toHaveScreenshot(`visual-${file}.png`, {
        fullPage: true,
      })
    })
  }
})

// ---------------------------------------------------------------------------
// 2. Template diagram – Adapter pattern loaded via fixture injection
// ---------------------------------------------------------------------------
// The Adapter template JSON lives in the webapp's public assets. We load it
// via fixture injection (the same approach as the 13 diagram fixtures above)
// so the test is deterministic and doesn't depend on Vite serving dynamic
// imports at runtime.

function loadJsonFile(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(raw) as Record<string, unknown>
}

const adapterTemplate = loadJsonFile(
  path.join(__dirname, "..", "..", "assets", "diagramTemplates", "Adapter.json")
)

test.describe("Template diagram", () => {
  test("Adapter template canvas matches baseline", async ({ page }) => {
    await injectFixtureIntoLocalStorage(page, adapterTemplate)
    await page.goto("/")
    await waitForCanvasReady(page)

    await expect(page).toHaveScreenshot("template-adapter.png", {
      fullPage: true,
    })
  })
})
