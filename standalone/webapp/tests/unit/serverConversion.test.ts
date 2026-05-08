/**
 * Cross-package integration test: drives the server-side PDF renderer
 * (`standalone/server`) against a real Apollon fixture and verifies that
 * the produced bytes are a well-formed PDF — the Artemis exam-integrity
 * rendering path.
 *
 * Lives in the webapp's vitest suite (rather than the server's, which has
 * no test runner today) because vitest is already configured here and
 * Node module resolution finds the server's source via a relative import.
 *
 * PNG is intentionally not exposed server-side; the client renders PNG via
 * resvg-wasm in a Web Worker.
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { beforeAll, describe, expect, it } from "vitest"

// Vitest's jsdom environment installs the global DOM, so the server
// renderer's `import "global-jsdom/register"` (in the worker thread, not
// the renderer module) is unnecessary here. We do still need to shim the
// SVG APIs that jsdom doesn't implement (ConversionService does this at
// runtime; we mirror it here so Vitest can drive the renderer directly).
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

import { renderPdf } from "../../../server/src/services/conversion-renderer"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = path.join(
  __dirname,
  "..",
  "fixtures",
  "class-diagram.json"
)
const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf-8"))

const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]) // "%PDF-"

describe("server-side conversion-renderer (Artemis exam integrity)", () => {
  // Server-side render boots JSDOM + Apollon library; first invocation
  // can take several seconds on slow CI.
  it("renders a real class diagram to a structurally complete PDF", async () => {
    const pdf = await renderPdf(fixture)
    expect(Array.from(pdf.subarray(0, 5))).toEqual(Array.from(PDF_MAGIC))
    expect(pdf.length).toBeGreaterThan(1024)
    // The Inter subset embedded for stereotype/italic rendering adds
    // ~380 KB; ≤ 1 MB catches an accidental re-raster regression.
    expect(pdf.length).toBeLessThan(1_000_000)
    // Last bytes must be the canonical `%%EOF` trailer.
    const tail = new TextDecoder("latin1").decode(pdf.subarray(-7))
    expect(tail).toMatch(/%%EOF\s*$/)
  }, 60_000)

  it("renderPdf is deterministic on byte length across repeat invocations", async () => {
    // Two renders of the same model must produce identical byte lengths.
    // A regression where the cached font base64 is mutated, or jsPDF's
    // font subset state leaks across calls, would shift the second
    // render's compressed size — the silent class of bug exam graders
    // can't spot by eye.
    const a = await renderPdf(fixture)
    const b = await renderPdf(fixture)
    expect(b.length).toBe(a.length)
  }, 60_000)
})
