import { Resvg } from "@resvg/resvg-js"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Bundled font files for deterministic SVG rendering.
 *
 * We use Inter (SIL Open Font License) as the primary font — the same font
 * used in the browser editor. This ensures visual regression tests match
 * the on-screen rendering as closely as possible.
 *
 * Liberation Sans (metrically identical to Arial) is included as a fallback
 * for any SVG text that explicitly specifies Arial/Helvetica.
 *
 * By loading ONLY these fonts and disabling system font loading, resvg
 * produces identical PNGs on macOS, Linux, and CI — eliminating the need
 * for per-platform snapshot baselines.
 */
const FONT_DIR = path.join(__dirname, "..", "fonts")
const FONT_FILES = [
  path.join(FONT_DIR, "Inter-Regular.ttf"),
  path.join(FONT_DIR, "Inter-Bold.ttf"),
  path.join(FONT_DIR, "LiberationSans-Regular.ttf"),
  path.join(FONT_DIR, "LiberationSans-Bold.ttf"),
]

/**
 * Render an SVG string to a PNG buffer using resvg (Rust-based renderer).
 *
 * This validates that the SVG renders correctly in a non-browser environment,
 * which is critical for exported SVGs that will be opened in PowerPoint,
 * Keynote, Inkscape, etc.
 *
 * Uses bundled Inter + Liberation Sans fonts (not system fonts) to ensure
 * identical output across all platforms.
 *
 * @param svgString - The SVG markup to render
 * @param width - Optional width to render at (defaults to SVG's intrinsic width)
 * @returns PNG image as a Buffer
 */
export function renderSVGtoPNG(svgString: string, width?: number): Buffer {
  const opts: Record<string, unknown> = {
    fitTo: width ? { mode: "width", value: width } : { mode: "original" },
    font: {
      // Use ONLY the bundled fonts — no system fonts.
      // This guarantees identical rendering on macOS, Linux, and CI.
      loadSystemFonts: false,
      fontFiles: FONT_FILES,
      defaultFontFamily: "Inter",
      sansSerifFamily: "Inter",
    },
    logLevel: "off",
  }

  const resvg = new Resvg(svgString, opts)
  const rendered = resvg.render()
  return Buffer.from(rendered.asPng())
}
