/**
 * Unit tests for the SVG → PNG rasteriser that backs PNG export.
 *
 * In production this dispatches to a Web Worker that runs resvg-wasm. jsdom
 * does not run real Workers, so we install a fake `Worker` factory through
 * `__test_internals__.setWorkerFactory` and exercise the message protocol.
 *
 * The goal is to lock in the failure paths the bug report (#667) was hitting
 * and the new failure paths that come from doing this in a Worker:
 *
 *   - resvg out-of-memory → RasterTooLargeError, not a hung promise.
 *   - Worker takes too long → RasterTimeoutError.
 *   - Worker reports an error message → propagated as a typed Error.
 *   - Scale is clamped before allocation when the diagram is huge.
 *   - Up to ≈75 MP at 1× still renders (the 'really large' requirement).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  RasterTimeoutError,
  RasterTooLargeError,
} from "../../src/utils/exportErrors"
import {
  __test_internals__,
  computeAppliedScale,
  svgToPng,
} from "../../src/utils/svgToPng"

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50"></svg>`

type WorkerBehaviour =
  | { type: "ok" }
  | { type: "error"; name: string; message: string }
  | { type: "stall" }

let behaviour: WorkerBehaviour = { type: "ok" }
let lastRequest: {
  svg: string
  scale: number
  background: string | null
} | null = null

class FakeWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: ErrorEvent) => void) | null = null
  terminated = false

  postMessage(req: {
    type: "render"
    id: string
    svg: string
    scale: number
    background: string | null
  }) {
    lastRequest = { svg: req.svg, scale: req.scale, background: req.background }
    if (behaviour.type === "stall") return
    queueMicrotask(() => {
      if (this.terminated) return
      if (behaviour.type === "error") {
        this.onmessage?.({
          data: {
            type: "error",
            id: req.id,
            error: { name: behaviour.name, message: behaviour.message },
          },
        } as MessageEvent)
        return
      }
      const png = new Uint8Array(8)
      this.onmessage?.({
        data: { type: "rendered", id: req.id, png, width: 100, height: 50 },
      } as MessageEvent)
    })
  }

  terminate() {
    this.terminated = true
  }
}

beforeEach(() => {
  behaviour = { type: "ok" }
  lastRequest = null
  __test_internals__.setWorkerFactory(
    () => new FakeWorker() as unknown as Worker
  )
})

afterEach(() => {
  vi.useRealTimers()
  __test_internals__.setWorkerFactory(null)
})

describe("computeAppliedScale", () => {
  it("returns the requested scale when no cap is hit", () => {
    expect(computeAppliedScale(100, 100, 1.5, 75_000_000, 16_384)).toBe(1.5)
  })

  it("clamps scale down so width * scale * height * scale ≤ maxArea", () => {
    // 9000 * 9000 = 81 MP at scale 1; allow at most 75 MP → applied < 1.
    const s = computeAppliedScale(9000, 9000, 2, 75_000_000, 16_384)
    expect(s).toBeLessThan(1)
    expect(s).toBeGreaterThan(0.8)
  })

  it("clamps scale by the per-side dimension cap", () => {
    expect(
      computeAppliedScale(40_000, 100, 2, 1_000_000_000, 16_000)
    ).toBeLessThanOrEqual(0.4)
  })

  it("returns requested scale when dimensions are zero or negative", () => {
    expect(computeAppliedScale(0, 100, 1.5, 1, 1)).toBe(1.5)
    expect(computeAppliedScale(100, -5, 1.5, 1, 1)).toBe(1.5)
  })
})

describe("svgToPng", () => {
  it("rasterises a small SVG and returns a PNG blob", async () => {
    const result = await svgToPng(SVG, { width: 100, height: 50 })

    expect(result.blob.type).toBe("image/png")
    expect(result.appliedScale).toBe(1.5)
    expect(result.clamped).toBe(false)
    expect(lastRequest).toEqual({
      svg: SVG,
      scale: 1.5,
      background: null,
    })
  })

  it("forwards the white-background option to the worker", async () => {
    await svgToPng(SVG, { width: 100, height: 50 }, { background: "#ffffff" })
    expect(lastRequest?.background).toBe("#ffffff")
  })

  it("clamps scale below the area budget for huge diagrams", async () => {
    const result = await svgToPng(
      SVG,
      { width: 10_000, height: 10_000 },
      { scale: 2, maxAreaPx: 16_000_000 }
    )
    expect(result.clamped).toBe(true)
    expect(result.appliedScale).toBeLessThan(2)
    expect(lastRequest?.scale).toBe(result.appliedScale)
  })

  it("renders an 8000×8000 diagram at scale 1 without clamping (75 MP budget)", async () => {
    const result = await svgToPng(
      SVG,
      { width: 8000, height: 8000 },
      { scale: 1 }
    )
    expect(result.clamped).toBe(false)
    expect(result.appliedScale).toBe(1)
  })

  it("rejects with RasterTooLargeError when the worker reports out-of-memory", async () => {
    behaviour = {
      type: "error",
      name: "RangeError",
      message: "memory access out of bounds",
    }
    await expect(
      svgToPng(SVG, { width: 5000, height: 5000 })
    ).rejects.toBeInstanceOf(RasterTooLargeError)
  })

  it("propagates non-OOM worker errors verbatim", async () => {
    behaviour = { type: "error", name: "TypeError", message: "bad svg" }
    await expect(svgToPng(SVG, { width: 100, height: 50 })).rejects.toThrow(
      "bad svg"
    )
  })

  it("rejects with RasterTimeoutError when the worker stalls", async () => {
    vi.useFakeTimers()
    behaviour = { type: "stall" }
    const promise = svgToPng(SVG, { width: 10, height: 10 }, { timeoutMs: 100 })
    promise.catch(() => {})
    await vi.advanceTimersByTimeAsync(101)
    await expect(promise).rejects.toBeInstanceOf(RasterTimeoutError)
  })

  it("rejects with RasterTooLargeError when the diagram has zero size", async () => {
    await expect(
      svgToPng(SVG, { width: 0, height: 50 })
    ).rejects.toBeInstanceOf(RasterTooLargeError)
  })
})
