/**
 * Integration test: useExportAsPNG → real svgToPng utility → fake Web Worker.
 *
 * Why a separate test file? The unit test for `svgToPng` mocks the worker;
 * the unit test for `useExportAsPNG` mocks `svgToPng`. Neither exercises the
 * full hook → util → worker protocol end-to-end inside Vitest. This test
 * fills that gap without spinning up a real browser worker (jsdom can't).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { __test_internals__ } from "../../src/utils/svgToPng"

const downloadFile = vi.fn()
const exportAsSVG = vi.fn()

vi.mock("@/contexts", () => ({
  useEditorContext: () => ({
    editor: {
      model: { title: "Integration Diagram" },
      exportAsSVG,
    },
  }),
}))

vi.mock("../../src/hooks/useFileDownload", () => ({
  useFileDownload: () => downloadFile,
}))

import { useExportAsPNG } from "../../src/hooks/useExportAsPNG"

class FakeWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: ErrorEvent) => void) | null = null

  postMessage(req: { type: "render"; id: string }) {
    queueMicrotask(() => {
      this.onmessage?.({
        data: {
          type: "rendered",
          id: req.id,
          png: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), // PNG magic
          width: 150,
          height: 75,
        },
      } as MessageEvent)
    })
  }

  terminate() {}
}

beforeEach(() => {
  downloadFile.mockReset()
  exportAsSVG.mockReset()
  exportAsSVG.mockResolvedValue({
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"></svg>',
    clip: { x: 0, y: 0, width: 100, height: 50 },
  })
  __test_internals__.setWorkerFactory(
    () => new FakeWorker() as unknown as Worker
  )
})

afterEach(() => {
  __test_internals__.setWorkerFactory(null)
})

describe("useExportAsPNG (integration)", () => {
  it("rasterises through the real svgToPng → worker pipeline and downloads a PNG file", async () => {
    const { result } = renderHook(() => useExportAsPNG())
    await result.current({ setWhiteBackground: true })

    expect(downloadFile).toHaveBeenCalledTimes(1)
    const call = downloadFile.mock.calls[0][0] as {
      file: File
      fileName: string
    }
    expect(call.fileName).toBe("Integration Diagram.png")
    expect(call.file).toBeInstanceOf(File)
    expect(call.file.type).toBe("image/png")
    expect(call.file.size).toBeGreaterThan(0)
  })
})
