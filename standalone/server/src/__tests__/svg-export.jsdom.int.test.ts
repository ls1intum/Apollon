import { describe, it, expect } from "vitest"
import { Worker } from "node:worker_threads"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

// Drive the COMPILED worker (the production artifact) in its own thread so the
// jsdom globals + font registration it installs never leak into this shared,
// non-isolated test process. Needs a prior server build; CI builds first.
const dir = path.dirname(fileURLToPath(import.meta.url))
const workerPath = path.resolve(
  dir,
  "../../dist/src/workers/svg-conversion-worker-thread.js"
)
const fixturesDir = path.resolve(dir, "../../../webapp/tests/fixtures")

const loadFixture = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(fixturesDir, file), "utf8"))

type ExportResult = {
  svg: string
  clip: { x: number; y: number; width: number; height: number }
}

function exportViaWorker(model: unknown): Promise<ExportResult> {
  const worker = new Worker(workerPath)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      void worker.terminate()
      reject(new Error("svg export worker timed out"))
    }, 30_000)
    worker.on(
      "message",
      (m: { ok: boolean; error?: string } & ExportResult) => {
        clearTimeout(timer)
        void worker.terminate()
        if (m.ok) resolve(m)
        else reject(new Error(m.error))
      }
    )
    worker.on("error", (e) => {
      clearTimeout(timer)
      reject(e)
    })
    worker.postMessage({ id: 1, model })
  })
}

// Outer node box: `<g transform="translate(x, y)"><svg width="W" height="H" ...`
function nodeWidths(svg: string): number[] {
  const re =
    /translate\(([-\d.]+),\s*([-\d.]+)\)"[^>]*>\s*<svg[^>]*?\bwidth="([\d.]+)"[^>]*?\bheight="([\d.]+)"/g
  const widths: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(svg))) widths.push(Math.round(Number(m[3])))
  return widths.sort((a, b) => a - b)
}

// One fixture per diagram type (mirrors svg-export.visual.spec.ts).
const ALL_TYPES = [
  "class-diagram.json",
  "object-diagram.json",
  "activity-diagram.json",
  "use-case-diagram.json",
  "communication-diagram.json",
  "component-diagram.json",
  "deployment-diagram.json",
  "petri-net.json",
  "reachability-graph.json",
  "syntax-tree.json",
  "flowchart.json",
  "bpmn.json",
  "sfc.json",
]

// Node-width multisets captured from the browser editor exporting these same
// fixtures (Chromium + the bundled Inter). The jsdom export must land within
// one 10px min-width grid step of them: proof that server measureText uses real
// Inter metrics, not the no-canvas `text.length * 8` fallback a broken `canvas`
// alias would trigger. Recapture from the editor if node sizing changes.
const BROWSER_NODE_WIDTHS: Record<string, number[]> = {
  "class-diagram.json": [160, 200, 200, 200, 200, 200, 340],
  "object-diagram.json": [170, 180, 180],
  "communication-diagram.json": [180, 180, 180],
  "sfc.json": [30, 30, 30, 72, 160, 160, 160, 160],
}
// One 10px min-width grid step (LAYOUT min-width snaps to 10) plus 2px rounding.
const WIDTH_TOLERANCE_PX = 12

describe("jsdom SVG export (no browser)", () => {
  it.each(ALL_TYPES)(
    "renders %s to a valid, deterministic compat SVG",
    async (file) => {
      const model = loadFixture(file)
      const first = await exportViaWorker(model)

      expect(first.svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(first.svg).toMatch(/viewBox="/)
      expect(first.clip.width).toBeGreaterThan(0)
      expect(first.clip.height).toBeGreaterThan(0)
      // compat mode resolves CSS variables for non-browser renderers
      expect(first.svg).not.toMatch(/var\(--/)

      const second = await exportViaWorker(model)
      expect(second.svg).toBe(first.svg)
    }
  )

  it.each(Object.keys(BROWSER_NODE_WIDTHS))(
    "sizes text-bearing nodes in %s to match the browser (real measureText)",
    async (file) => {
      const { svg } = await exportViaWorker(loadFixture(file))
      const got = nodeWidths(svg)
      const want = BROWSER_NODE_WIDTHS[file]

      expect(got).toHaveLength(want.length)
      got.forEach((width, i) => {
        expect(Math.abs(width - want[i])).toBeLessThanOrEqual(
          WIDTH_TOLERANCE_PX
        )
      })
    }
  )

  // Integrity: edge labels are student-authored content. jsdom returns a zero
  // getBoundingClientRect for SVG text, so without the measureText-based bounds
  // fallback an overhanging label is silently cropped from the graded image.
  it("keeps every edge label inside the export clip (no cropped messages)", async () => {
    const { svg, clip } = await exportViaWorker(
      loadFixture("communication-diagram.json")
    )

    const labels = [
      ...svg.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)"[^>]*>([^<]+)</g),
    ]
      .map((m) => ({ x: Number(m[1]), y: Number(m[2]), text: m[3] }))
      .filter((t) => /\d:\s/.test(t.text)) // message labels like "1: request()"

    expect(labels.length).toBeGreaterThan(0)
    expect(labels.map((l) => l.text)).toContain("1: request()")

    for (const label of labels) {
      expect(label.x).toBeGreaterThanOrEqual(clip.x)
      expect(label.x).toBeLessThanOrEqual(clip.x + clip.width)
      expect(label.y).toBeGreaterThanOrEqual(clip.y)
      expect(label.y).toBeLessThanOrEqual(clip.y + clip.height)
    }
  })
})
