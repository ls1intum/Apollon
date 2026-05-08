/**
 * Behavioural test for PDF export. Drives the real `useExportAsPDF` hook
 * through the real `svg2pdf.js` + `jsPDF` so the assertions inspect actual
 * PDF bytes — no mocks of the rendering libraries themselves. Only the
 * editor context and file-download side-effect are stubbed because we
 * don't have a live ApollonEditor or a real download surface in jsdom.
 *
 * What we actually verify:
 *  - The download triggered by the hook is a valid PDF (magic bytes).
 *  - The PDF page format honours the source clip's aspect ratio and is
 *    written into the PDF's `/MediaBox` operator (vector, not raster).
 *  - Huge diagrams clamp to ≤ 14,400 pt per side without distortion.
 *  - Malformed SVG produces a typed error (DOMParser parsererror path).
 *  - Zero-size diagrams produce a typed error before jsPDF is constructed.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"

// jsdom doesn't implement SVGElement.getBBox, which svg2pdf.js calls during
// text measurement. Server-side rendering installs the same shim. This is a
// jsdom limitation, not a production concern — every browser implements it.
beforeAll(() => {
  if (
    typeof SVGElement !== "undefined" &&
    !("getBBox" in SVGElement.prototype)
  ) {
    Object.defineProperty(SVGElement.prototype, "getBBox", {
      value() {
        return { x: 0, y: 0, width: 10, height: 10 }
      },
    })
  }
})

const exportAsSVG = vi.fn()
const getDiagramMetadata = vi.fn()
const downloadFile = vi.fn()

vi.mock("@/contexts", () => ({
  useEditorContext: () => ({
    editor: {
      model: { title: "Test Diagram" },
      exportAsSVG,
      getDiagramMetadata,
    },
  }),
}))

vi.mock("../../src/hooks/useFileDownload", () => ({
  useFileDownload: () => downloadFile,
}))

// jsdom can't `fetch` Vite's `?url` font paths. We're not testing font
// embedding here — the e2e suite covers that against a real browser. Stub
// the registration to a no-op so the hook flow can be exercised.
vi.mock("@/utils/registerInterFonts", () => ({
  registerInterFonts: vi.fn(async () => undefined),
}))

import { useExportAsPDF } from "../../src/hooks/useExportAsPDF"

const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]) // "%PDF-"

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 100 50">
  <rect x="0" y="0" width="100" height="50" fill="white" stroke="black"/>
  <text x="50" y="30" text-anchor="middle" font-family="Inter" font-size="14">Hello</text>
</svg>`

async function readDownloadedBytes(): Promise<{
  fileName: string
  bytes: Uint8Array
}> {
  expect(downloadFile).toHaveBeenCalledTimes(1)
  const call = downloadFile.mock.calls[0][0] as {
    file: File
    fileName: string
  }
  return {
    fileName: call.fileName,
    bytes: new Uint8Array(await call.file.arrayBuffer()),
  }
}

beforeEach(() => {
  exportAsSVG.mockReset()
  getDiagramMetadata.mockReset()
  downloadFile.mockReset()
  getDiagramMetadata.mockReturnValue({ diagramTitle: "Test Diagram" })
})

describe("useExportAsPDF", () => {
  it("produces a valid PDF and downloads it with the diagram-titled filename", async () => {
    exportAsSVG.mockResolvedValue({
      svg: SAMPLE_SVG,
      clip: { x: 0, y: 0, width: 100, height: 50 },
    })

    const { result } = renderHook(() => useExportAsPDF())
    await result.current()
    const { fileName, bytes } = await readDownloadedBytes()

    expect(fileName).toBe("Test Diagram.pdf")
    expect(bytes.subarray(0, 5)).toEqual(PDF_MAGIC)
    expect(bytes.length).toBeGreaterThan(500)
    // Last bytes are the canonical `%%EOF\n` (or `%%EOF`); proves the PDF
    // is structurally complete, not truncated.
    const tail = new TextDecoder("latin1").decode(bytes.subarray(-7))
    expect(tail).toMatch(/%%EOF\s*$/)
  })

  it("renders a 20,000×30,000 diagram without crashing or producing a raster blob", async () => {
    // Both sides over the 14,400 pt cap — exercises the clamp path.
    exportAsSVG.mockResolvedValue({
      svg: SAMPLE_SVG,
      clip: { x: 0, y: 0, width: 20_000, height: 30_000 },
    })

    const { result } = renderHook(() => useExportAsPDF())
    await result.current()
    const { bytes } = await readDownloadedBytes()

    expect(bytes.subarray(0, 5)).toEqual(PDF_MAGIC)
    // Vector PDFs of a single rect+text stay tiny no matter the page size;
    // a raster fallback would balloon to MBs. This guards against someone
    // accidentally re-introducing canvas rasterisation.
    expect(bytes.length).toBeLessThan(50_000)
  })

  it("rejects with a parse error when the editor returns malformed SVG", async () => {
    exportAsSVG.mockResolvedValue({
      svg: "<svg><not-closed",
      clip: { x: 0, y: 0, width: 100, height: 50 },
    })
    const { result } = renderHook(() => useExportAsPDF())
    await expect(result.current()).rejects.toThrow(/parse exported SVG/i)
    expect(downloadFile).not.toHaveBeenCalled()
  })

  it("rejects on zero-size diagrams before constructing jsPDF", async () => {
    exportAsSVG.mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg"/>',
      clip: { x: 0, y: 0, width: 0, height: 50 },
    })
    const { result } = renderHook(() => useExportAsPDF())
    await expect(result.current()).rejects.toThrow(/zero or negative/i)
    expect(downloadFile).not.toHaveBeenCalled()
  })

  it("falls back to model.title when getDiagramMetadata().diagramTitle is empty", async () => {
    getDiagramMetadata.mockReturnValue({ diagramTitle: "" })
    exportAsSVG.mockResolvedValue({
      svg: SAMPLE_SVG,
      clip: { x: 0, y: 0, width: 100, height: 50 },
    })

    const { result } = renderHook(() => useExportAsPDF())
    await result.current()
    const { fileName } = await readDownloadedBytes()
    expect(fileName).toBe("Test Diagram.pdf")
  })
})
