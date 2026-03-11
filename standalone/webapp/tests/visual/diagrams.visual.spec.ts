import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import {
  waitForCanvasReady,
  injectFixtureIntoLocalStorage,
  clickFitView,
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
      await page.goto("/")
      await waitForCanvasReady(page)

      // For large diagrams that overflow at zoom 1.0, click the built-in
      // ReactFlow fit-view button so the full diagram is captured.
      if (fitView) {
        await clickFitView(page)
      }

      // Screenshot the editor area (sidebar + canvas) excluding the navbar,
      // so visual diffs focus on diagram rendering, not unrelated UI chrome.
      // Allow a small pixel diff ratio (0.03) to accommodate cross-platform
      // font hinting / sub-pixel rendering differences (macOS vs Linux CI).
      const editorArea = page.locator('[data-testid="editor-area"]')
      await expect(editorArea).toHaveScreenshot(`visual-${file}.png`, {
        maxDiffPixelRatio: 0.03,
      })
    })
  }
})

// ---------------------------------------------------------------------------
// 2. Template diagrams – GoF design pattern templates loaded via fixture injection
// ---------------------------------------------------------------------------
// The template JSON files live in the webapp's assets directory. We load them
// via fixture injection (the same approach as the 13 diagram fixtures above)
// so the tests are deterministic and don't depend on Vite serving dynamic
// imports at runtime.

function loadJsonFile(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(raw) as Record<string, unknown>
}

const templatesDir = path.join(
  __dirname,
  "..",
  "..",
  "assets",
  "diagramTemplates"
)

const templateDiagrams = [
  { name: "Adapter", file: "Adapter" },
  { name: "Bridge", file: "Bridge" },
  { name: "Command", file: "Command" },
  { name: "Observer", file: "Observer" },
  { name: "Factory", file: "Factory" },
]

test.describe("Template diagrams", () => {
  for (const { name, file } of templateDiagrams) {
    test(`${name} template canvas matches baseline`, async ({ page }) => {
      const template = loadJsonFile(path.join(templatesDir, `${file}.json`))
      await injectFixtureIntoLocalStorage(page, template)
      await page.goto("/")
      await waitForCanvasReady(page)

      const editorArea = page.locator('[data-testid="editor-area"]')
      await expect(editorArea).toHaveScreenshot(
        `template-${name.toLowerCase()}.png`,
        { maxDiffPixelRatio: 0.03 }
      )
    })
  }
})
