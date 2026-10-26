import { describe, it, expect } from "vitest"
import { Worker } from "node:worker_threads"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

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
  const worker = new Worker(workerPath, { stderr: true })
  let stderr = ""
  worker.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString()
  })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      void worker.terminate()
      reject(new Error("svg export worker timed out"))
    }, 30_000)
    worker.on(
      "message",
      async (m: { ok: boolean; error?: string; data?: string }) => {
        clearTimeout(timer)
        await worker.terminate()
        if (/(?:TypeError|ReferenceError|Error):/.test(stderr)) {
          reject(new Error(`SVG worker exception: ${stderr}`))
          return
        }
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
  it("preserves viewport translation and zoom when computing its matrix", async () => {
    const shimUrl = pathToFileURL(
      path.resolve(dir, "../../dist/src/workers/jsdom-shims.js")
    ).href
    const worker = new Worker(
      `const { parentPort } = require("node:worker_threads")
       import(${JSON.stringify(shimUrl)}).then(() => {
         const el = document.createElement("div")
         el.className = "xyflow__viewport"
         document.body.appendChild(el)
         const matrices = [[120, -35, 0.5], [-10.25, 40.5, 2], [0, 0, 1]].map(([x, y, zoom]) => {
           el.style.transform = \`translate(\${x}px,\${y}px) scale(\${zoom})\`
           const matrix = new window.DOMMatrixReadOnly(window.getComputedStyle(el).transform)
           return [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f, el.style.transform]
         })
         el.style.transform = "rotate(20deg)"
         const unknown = window.getComputedStyle(el).transform
         let unknownRejected = false
         try { new window.DOMMatrixReadOnly(unknown) } catch { unknownRejected = true }
         el.className = ""
         el.style.transform = "translate(1px,2px) scale(3)"
         parentPort.postMessage({ matrices, unknown, unknownRejected, unrelated: window.getComputedStyle(el).transform })
       })`,
      { eval: true }
    )
    try {
      const result = await new Promise((resolve, reject) => {
        worker.once("message", resolve)
        worker.once("error", reject)
      })
      expect(result).toEqual({
        matrices: [
          [0.5, 0, 0, 0.5, 120, -35, "translate(120px,-35px) scale(0.5)"],
          [2, 0, 0, 2, -10.25, 40.5, "translate(-10.25px,40.5px) scale(2)"],
          [1, 0, 0, 1, 0, 0, "translate(0px,0px) scale(1)"],
        ],
        unknown: "rotate(20deg)",
        unknownRejected: true,
        unrelated: "translate(1px,2px) scale(3)",
      })
    } finally {
      await worker.terminate()
    }
  })

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
