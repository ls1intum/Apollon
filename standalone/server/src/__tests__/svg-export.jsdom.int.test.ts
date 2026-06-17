import { describe, it, expect } from "vitest"
import { Worker } from "node:worker_threads"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

// Drive the COMPILED worker in its own thread (same jsdom-shims + conversion
// pipeline the production server uses) so the jsdom globals + font registration
// never leak into this shared, non-isolated test process. Needs a prior server
// build; CI builds first.
const dir = path.dirname(fileURLToPath(import.meta.url))
const workerPath = path.resolve(
  dir,
  "../../dist/src/workers/conversion-worker-thread.js"
)
const fixturesDir = path.resolve(dir, "../../../webapp/tests/fixtures")

const loadFixture = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(fixturesDir, file), "utf8"))

type ExportResult = {
  svg: string
  clip: { width: number; height: number }
}

// The svg viewBox is `clipX clipY clipW clipH`; width/height attrs equal clipW/H.
function clipFromSvg(svg: string): ExportResult["clip"] {
  const vb = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/)
  return { width: vb ? Number(vb[3]) : 0, height: vb ? Number(vb[4]) : 0 }
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
      (m: { ok: boolean; error?: string; data?: string }) => {
        clearTimeout(timer)
        void worker.terminate()
        if (m.ok && m.data) resolve({ svg: m.data, clip: clipFromSvg(m.data) })
        else reject(new Error(m.error))
      }
    )
    worker.on("error", (e) => {
      clearTimeout(timer)
      reject(e)
    })
    worker.postMessage({ id: 1, model, format: "svg" })
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

  // Integrity regression: edge labels are student-authored content, and jsdom
  // returns a zero getBoundingClientRect for SVG text. Without the
  // measureText-based bounds fallback, a label overhanging the node/edge
  // geometry is silently cropped. A long message can only be enclosed if the
  // fallback measures it and widens the clip — so the clip MUST grow when the
  // message grows. (Anchor-in-clip checks pass even with the fallback disabled,
  // because the stock fixture's labels already fit; this does not.)
  it("widens the export clip to enclose an overhanging edge label", async () => {
    const base = loadFixture("communication-diagram.json")
    const baseExport = await exportViaWorker(base)
    expect(baseExport.svg).toContain("1: request()")

    const long = structuredClone(base) as typeof base & {
      edges: { data?: { messages?: { text: string }[] } }[]
    }
    const marker = "OVERHANGING_" + "x".repeat(60)
    for (const edge of long.edges) {
      for (const message of edge.data?.messages ?? []) message.text = marker
    }
    const longExport = await exportViaWorker(long)

    expect(longExport.svg).toContain(marker)
    // The 60-char label sticks far past the node cluster; only the fallback can
    // pull the clip out to hold it. Disabling the fallback leaves this < 100.
    expect(longExport.clip.width).toBeGreaterThan(baseExport.clip.width + 100)
  })
})
