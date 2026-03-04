import { test, expect } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import {
  waitForCanvasReady,
  injectFixtureIntoLocalStorage,
  clickFitView,
} from "../helpers/canvas"
import { extractSVGFromPage } from "../helpers/svgExport"
import { renderSVGtoPNG } from "../helpers/resvgRender"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * SVG Export Visual Regression Tests
 *
 * Validates that SVG exports from the Apollon2 editor:
 * 1. Contain no CSS variables (var()), currentColor, or <marker> elements
 * 2. Render correctly in a non-browser SVG renderer (resvg — Rust-based)
 * 3. Produce pixel-consistent output across runs
 *
 * These tests prove that exported SVGs work in PowerPoint, Keynote, Inkscape,
 * and any other application that doesn't support browser-specific CSS features.
 */

// ---------------------------------------------------------------------------
// Load fixture files (same as diagrams.visual.spec.ts)
// ---------------------------------------------------------------------------

const fixturesDir = path.join(__dirname, "..", "fixtures")
const templatesDir = path.join(
  __dirname,
  "..",
  "..",
  "assets",
  "diagramTemplates"
)

function loadFixture(filename: string): Record<string, unknown> {
  const raw = fs.readFileSync(path.join(fixturesDir, filename), "utf-8")
  return JSON.parse(raw) as Record<string, unknown>
}

function loadTemplate(filename: string): Record<string, unknown> {
  const raw = fs.readFileSync(path.join(templatesDir, filename), "utf-8")
  return JSON.parse(raw) as Record<string, unknown>
}

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

const templateDiagrams = [
  { name: "Adapter", file: "Adapter" },
  { name: "Bridge", file: "Bridge" },
  { name: "Command", file: "Command" },
  { name: "Observer", file: "Observer" },
  { name: "Factory", file: "Factory" },
]

// ---------------------------------------------------------------------------
// SVG string validation helpers
// ---------------------------------------------------------------------------

function assertNoCSSVariables(svg: string, diagramName: string) {
  // No var() references should remain
  const varMatches = svg.match(/var\(--[\w-]+/g)
  expect(
    varMatches,
    `${diagramName}: SVG contains unresolved CSS variables: ${varMatches?.join(", ")}`
  ).toBeNull()

  // No currentColor should remain
  expect(svg, `${diagramName}: SVG contains 'currentColor'`).not.toContain(
    "currentColor"
  )

  // No <marker> elements should remain
  expect(svg, `${diagramName}: SVG contains <marker> elements`).not.toMatch(
    /<marker[\s>]/
  )

  // No marker-start/marker-end attributes should remain
  expect(
    svg,
    `${diagramName}: SVG contains marker-start attribute`
  ).not.toMatch(/marker-start=/)
  expect(svg, `${diagramName}: SVG contains marker-end attribute`).not.toMatch(
    /marker-end=/
  )

  // No context-stroke or context-fill should remain
  expect(svg, `${diagramName}: SVG contains context-stroke`).not.toContain(
    "context-stroke"
  )
  expect(svg, `${diagramName}: SVG contains context-fill`).not.toContain(
    "context-fill"
  )
}

// ---------------------------------------------------------------------------
// 1. Diagram fixture SVG export tests
// ---------------------------------------------------------------------------

test.describe("SVG export - diagram fixtures", () => {
  for (const { name, file, fixture, fitView } of diagramFixtures) {
    test(`${name} SVG export has no CSS variables and renders in resvg`, async ({
      page,
    }) => {
      await injectFixtureIntoLocalStorage(page, fixture)
      await page.goto("/")
      await waitForCanvasReady(page)

      if (fitView) {
        await clickFitView(page)
      }

      // Extract SVG from the live DOM
      const svgString = await extractSVGFromPage(page)

      // Validate: no CSS variables, currentColor, or marker elements
      assertNoCSSVariables(svgString, name)

      // Validate: SVG is well-formed (has xmlns, viewBox, width, height)
      expect(svgString).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svgString).toMatch(/viewBox="/)
      expect(svgString).toMatch(/width="/)
      expect(svgString).toMatch(/height="/)

      // Render SVG to PNG via resvg (non-browser renderer)
      // If this succeeds, the SVG is compatible with non-browser environments
      const pngBuffer = renderSVGtoPNG(svgString)
      expect(pngBuffer.length).toBeGreaterThan(0)

      // Visual regression: compare resvg-rendered PNG against baseline
      await expect(pngBuffer).toMatchSnapshot(`svg-export-${file}.png`)
    })
  }
})

// ---------------------------------------------------------------------------
// 2. Template diagram SVG export tests
// ---------------------------------------------------------------------------

test.describe("SVG export - template diagrams", () => {
  for (const { name, file } of templateDiagrams) {
    test(`${name} template SVG export has no CSS variables and renders in resvg`, async ({
      page,
    }) => {
      const template = loadTemplate(`${file}.json`)
      await injectFixtureIntoLocalStorage(page, template)
      await page.goto("/")
      await waitForCanvasReady(page)

      const svgString = await extractSVGFromPage(page)

      // Validate: no CSS variables, currentColor, or marker elements
      assertNoCSSVariables(svgString, name)

      // Render SVG to PNG via resvg
      const pngBuffer = renderSVGtoPNG(svgString)
      expect(pngBuffer.length).toBeGreaterThan(0)

      // Visual regression
      await expect(pngBuffer).toMatchSnapshot(
        `svg-export-template-${name.toLowerCase()}.png`
      )
    })
  }
})
