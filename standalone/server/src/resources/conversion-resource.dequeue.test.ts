/**
 * Unit tests for the conversion-resource queue scheduling.
 *
 * Stub the underlying worker so jobs only complete when the test
 * calls `completeActive()`. That gives us a deterministic, sync
 * harness to assert SVG-priority and the anti-starvation backstop
 * without spawning a real Node Worker thread.
 */
import { describe, expect, it } from "vitest"
import { Worker } from "node:worker_threads"
import { ConversionResource, type SvgRender } from "./conversion-resource"
import type { UMLModel } from "@tumaet/apollon"

interface Dispatched {
  id: number
  mode: "pdf" | "svg"
}

class TestableConversionResource extends ConversionResource {
  public dispatched: Dispatched[] = []

  protected override createWorker(): Worker {
    // Capture what would have been postMessaged to the worker. The
    // base class only uses `postMessage`/`on`/`removeListener`/
    // `terminate` from the Worker API; everything else can be a
    // no-op for the duration of a test.
    const fake = {
      postMessage: (msg: Dispatched) => {
        this.dispatched.push({ id: msg.id, mode: msg.mode })
      },
      on: () => fake,
      removeListener: () => fake,
      terminate: () => Promise.resolve(0),
    } as unknown as Worker
    return fake
  }

  /**
   * Resolve the most recently dispatched job as if the worker
   * posted back a success message. The base class's dispatcher is
   * private; we drive it via a single `as`-cast — the test bypasses
   * encapsulation for harness purposes only.
   */
  completeActive(): void {
    const last = this.dispatched[this.dispatched.length - 1]
    if (!last) return
    type HMM = { handleWorkerMessage: (m: unknown) => void }
    const handler = (this as unknown as HMM).handleWorkerMessage.bind(this)
    if (last.mode === "pdf") {
      handler({
        id: last.id,
        ok: true,
        type: "pdf",
        bytes: new Uint8Array([]),
      })
    } else {
      handler({
        id: last.id,
        ok: true,
        type: "svg",
        svg: "<svg/>",
        clip: { x: 0, y: 0, width: 1, height: 1 },
      })
    }
  }
}

const stubModel: UMLModel = {
  version: "4.0.0",
  id: "x",
  title: "x",
  type: "ClassDiagram",
  nodes: [],
  edges: [],
  assessments: {},
}

describe("ConversionResource queue scheduling", () => {
  it("SVG entries jump ahead of PDF entries waiting in the queue", async () => {
    const r = new TestableConversionResource()
    // Job 1 (PDF) is dispatched immediately to the empty worker —
    // that's just the base class's eager dispatch, not a scheduling
    // signal. While that's active, queue PDF + SVG; when the active
    // job completes, the SVG should be dequeued ahead of the PDF.
    const firstPdf = r["renderPdf"](stubModel) as Promise<Buffer>
    expect(r.dispatched.length).toBe(1)
    const queuedPdf = r["renderPdf"](stubModel) as Promise<Buffer>
    const queuedSvg = r.renderSvg(stubModel) as Promise<SvgRender>
    // Both new entries are queued; the worker is still on the first.
    expect(r.dispatched.length).toBe(1)
    r.completeActive()
    await firstPdf
    // Next dispatch: SVG, even though the second PDF is older.
    expect(r.dispatched[1]?.mode).toBe("svg")
    r.completeActive()
    await queuedSvg
    // Then the queued PDF.
    expect(r.dispatched[2]?.mode).toBe("pdf")
    r.completeActive()
    await queuedPdf
  })

  it("anti-starvation: a PDF skipped 8 times is forced to the queue head", async () => {
    const r = new TestableConversionResource()
    // Park the worker on a dummy SVG so we can build the queue
    // shape we want without anything dispatching.
    const dummy = r.renderSvg(stubModel) as Promise<SvgRender>
    expect(r.dispatched.length).toBe(1)
    // Queue: [PDF, SVG×9]. With dummy still active, dequeueNext
    // never fires; this is a pure setup phase.
    const stuckPdf = r["renderPdf"](stubModel) as Promise<Buffer>
    const svgPromises: Promise<SvgRender>[] = []
    for (let i = 0; i < 9; i++) {
      svgPromises.push(r.renderSvg(stubModel) as Promise<SvgRender>)
    }
    expect(r.dispatched.length).toBe(1)
    r.completeActive()
    await dummy
    // Now drain. Every dispatch should pick an SVG (jumping over
    // the PDF) until the PDF's skipCount hits 8 and the next pick
    // promotes it.
    for (let i = 0; i < 8; i++) {
      expect(r.dispatched[1 + i]?.mode).toBe("svg")
      r.completeActive()
      await svgPromises[i]
    }
    // 10th overall dispatch (1 dummy + 8 SVG + 1 promoted PDF):
    // anti-starvation kicks in.
    expect(r.dispatched[9]?.mode).toBe("pdf")
    r.completeActive()
    await stuckPdf
    // Final SVG drains last.
    expect(r.dispatched[10]?.mode).toBe("svg")
    r.completeActive()
    await svgPromises[8]
  })

  it("FIFO when only one mode is queued", async () => {
    const r = new TestableConversionResource()
    const a = r.renderSvg(stubModel) as Promise<SvgRender>
    const b = r.renderSvg(stubModel) as Promise<SvgRender>
    expect(r.dispatched[0]?.id).toBe(1)
    r.completeActive()
    await a
    expect(r.dispatched[1]?.id).toBe(2)
    r.completeActive()
    await b
  })
})
