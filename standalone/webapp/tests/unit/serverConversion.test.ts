/**
 * Cross-package integration test: drives the server-side conversion
 * renderers (`standalone/server`) against a real Apollon fixture and
 * verifies that the produced bytes are well-formed PNG / PDF — i.e. the
 * Artemis exam-integrity rendering path is wired correctly.
 *
 * Lives in the webapp's vitest suite (rather than the server's, which has
 * no test runner today) because vitest is already configured here and
 * Node module resolution finds the server's source via a relative import.
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

import {
  renderPng,
  renderPdf,
} from "../../../server/src/services/conversion-renderer"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = path.join(
  __dirname,
  "..",
  "fixtures",
  "class-diagram.json"
)
const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf-8"))

const PNG_MAGIC = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]) // "%PDF-"

describe("server-side conversion-renderer (Artemis exam integrity)", () => {
  // Server-side render boots JSDOM + Apollon library; first invocation
  // can take several seconds on slow CI.
  it("renders a real class diagram to a non-empty PNG with a valid header", async () => {
    const png = await renderPng(fixture)
    expect(Array.from(png.subarray(0, 8))).toEqual(Array.from(PNG_MAGIC))
    expect(png.length).toBeGreaterThan(10_000)
  }, 60_000)

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

  it("renderPng is deterministic across repeat invocations (no font-cache leak)", async () => {
    // Two renders of the same model must produce identical byte lengths.
    // A regression where the cached `fontFiles()` array is mutated, or
    // resvg-js's wasm memory leaks glyph state, would shift the second
    // render's compressed size — exactly the silent class of bug exam
    // graders can't spot by eye.
    const a = await renderPng(fixture)
    const b = await renderPng(fixture)
    expect(b.length).toBe(a.length)
  }, 60_000)
})
