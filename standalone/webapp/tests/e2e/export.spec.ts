/**
 * Smoke tests for the File → Export menu. Closes the regression in #667 where
 * PNG and PDF silently produced no download. These do not pixel-compare; the
 * visual specs in `tests/visual/` cover that. We only assert the user-visible
 * contract: clicking each menu item produces a non-empty download with the
 * right MIME / extension, and a complex template diagram still works.
 */
import { test, expect, type Page } from "@playwright/test"
import {
  waitForCanvasReady,
  injectFixtureIntoLocalStorage,
} from "../helpers/canvas"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fixturesDir = path.join(__dirname, "..", "fixtures")

function loadFixture(filename: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(fixturesDir, filename), "utf-8")
  ) as Record<string, unknown>
}

async function openExportSubmenu(page: Page) {
  await page.locator("#file-menu-button").first().click()
  await page.getByRole("menuitem", { name: /^Export/ }).click()
}

/**
 * Download timeout 60s instead of Playwright's default 30s — the resvg-wasm
 * module + 2 fonts are fetched on the very first PNG export of a session
 * (cold start ~5–10s on slow CI). Once warm, exports finish in <2s.
 */
const COLD_DOWNLOAD_TIMEOUT_MS = 60_000

async function expectDownload(
  page: Page,
  menuItemName: RegExp,
  extension: string
) {
  const downloadPromise = page.waitForEvent("download", {
    timeout: COLD_DOWNLOAD_TIMEOUT_MS,
  })
  await page.getByRole("menuitem", { name: menuItemName }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(
    new RegExp(`\\.${extension}$`, "i")
  )
  const tmp = await download.path()
  expect(tmp).toBeTruthy()
  const stat = fs.statSync(tmp!)
  expect(stat.size).toBeGreaterThan(0)
  return { download, size: stat.size, path: tmp! }
}

/** First 8 bytes of every PNG. */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
/** Every PDF starts with `%PDF-`. */
const PDF_MAGIC = Buffer.from("%PDF-", "ascii")

function readMagic(filePath: string, len: number): Buffer {
  const fd = fs.openSync(filePath, "r")
  const buf = Buffer.alloc(len)
  fs.readSync(fd, buf, 0, len, 0)
  fs.closeSync(fd)
  return buf
}

test.describe("File → Export (issue #667 regression)", () => {
  // Cold wasm + font load on first PNG export pushes us past Playwright's 30 s
  // default. Subsequent exports in the same browser context are <2 s.
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await injectFixtureIntoLocalStorage(page, loadFixture("class-diagram.json"))
    await page.goto("/")
    await waitForCanvasReady(page)
    // The on-screen layout depends on Inter being loaded before the SVG is
    // measured; resvg-wasm uses the bundled Inter family regardless.
    await page.evaluate(() => document.fonts.ready)
  })

  test("exports SVG", async ({ page }) => {
    await openExportSubmenu(page)
    await expectDownload(page, /As SVG$/, "svg")
  })

  test("exports JSON", async ({ page }) => {
    await openExportSubmenu(page)
    await expectDownload(page, /As JSON$/, "json")
  })

  test("exports PNG with white background — magic bytes valid, ≥10 KB", async ({
    page,
  }) => {
    await openExportSubmenu(page)
    const { path: pngPath, size } = await expectDownload(
      page,
      /As PNG \(White Background\)/,
      "png"
    )
    expect(readMagic(pngPath, 8).equals(PNG_MAGIC)).toBe(true)
    // Class-diagram fixture renders ≥ 10 KB even at the smallest reasonable
    // scale; <1 KB would mean an empty render with white background only.
    expect(size).toBeGreaterThan(10_000)
  })

  test("exports PNG with transparent background — magic bytes valid", async ({
    page,
  }) => {
    await openExportSubmenu(page)
    const { path: pngPath, size } = await expectDownload(
      page,
      /As PNG \(Transparent Background\)/,
      "png"
    )
    expect(readMagic(pngPath, 8).equals(PNG_MAGIC)).toBe(true)
    expect(size).toBeGreaterThan(5_000)
  })

  test("exports vector PDF — magic + size + every stereotype label preserved", async ({
    page,
  }) => {
    await openExportSubmenu(page)
    const { size, path: pdfPath } = await expectDownload(page, /As PDF$/, "pdf")
    expect(readMagic(pdfPath, 5).equals(PDF_MAGIC)).toBe(true)
    // The old raster pipeline produced 0-byte / corrupt PDFs on this diagram.
    expect(size).toBeGreaterThan(1024)
    // Embedding the Inter font subset adds ~380 KB; without it the PDF
    // would stay tiny. ≤ 1 MB catches an accidental re-raster regression.
    expect(size).toBeLessThan(1_000_000)

    // Critical for Artemis exam-integrity: every UML stereotype must appear
    // verbatim in the PDF text content. The class-diagram fixture has all
    // three stereotype patterns and an italic abstract class name. A
    // regression in font registration, percentage font-size handling, or
    // the JSDOM getBBox shim would silently drop these labels.
    const extracted = await extractPdfText(fs.readFileSync(pdfPath))
    for (const literal of [
      "«Interface»",
      "«Abstract»",
      "«Enumeration»",
      "Animal",
      "IMovable",
      "Vehicle",
      "Color",
    ]) {
      expect(
        extracted,
        `${literal} should appear in PDF text content`
      ).toContain(literal)
    }
  })
})

/**
 * Minimal PDF text extractor for our specific output (jsPDF + svg2pdf with
 * an embedded Inter subset). Walks every FlateDecode content stream + every
 * /ToUnicode CMap and decodes both literal `(text) Tj` and CID-encoded
 * `<hex> Tj` operators. Just enough to assert presence of stereotype labels
 * without pulling in a 1 MB pdf-parse dependency.
 */
async function extractPdfText(bytes: Buffer): Promise<string> {
  const { promisify } = await import("node:util")
  const zlib = await import("node:zlib")
  const inflate = promisify(zlib.inflate)

  const streams: string[] = []
  const re =
    /\/Filter\s*\/FlateDecode[^>]*>>\s*stream\s*\r?\n([\s\S]*?)\r?\nendstream/g
  let m: RegExpExecArray | null
  const raw = bytes.toString("latin1")
  while ((m = re.exec(raw)) !== null) {
    try {
      streams.push(
        (await inflate(Buffer.from(m[1], "latin1"))).toString("latin1")
      )
    } catch {
      /* skip non-flate streams */
    }
  }
  const all = raw + "\n" + streams.join("\n")

  // CID → unicode from every /ToUnicode CMap.
  const cidMap = new Map<string, string>()
  const cmapRe = /beginbfchar\s+([\s\S]*?)endbfchar/g
  let cm: RegExpExecArray | null
  while ((cm = cmapRe.exec(all)) !== null) {
    const pairRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g
    let p: RegExpExecArray | null
    while ((p = pairRe.exec(cm[1])) !== null) {
      cidMap.set(p[1].toLowerCase(), String.fromCodePoint(parseInt(p[2], 16)))
    }
  }

  let out = ""
  const tjRe = /\(((?:\\.|[^()\\])*)\)\s*Tj|<([0-9a-fA-F\s]+)>\s*Tj/g
  let t: RegExpExecArray | null
  while ((t = tjRe.exec(all)) !== null) {
    if (t[1] !== undefined) {
      out +=
        " " +
        t[1].replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\")
    } else if (t[2] !== undefined) {
      const hex = t[2].replace(/\s+/g, "")
      let s = ""
      for (let i = 0; i + 4 <= hex.length; i += 4) {
        s += cidMap.get(hex.slice(i, i + 4).toLowerCase()) ?? ""
      }
      out += " " + s
    }
  }
  return out
}
