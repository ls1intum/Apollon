import { Resvg } from "@resvg/resvg-js"

/**
 * Render an SVG string to a PNG buffer using resvg (Rust-based renderer).
 *
 * This validates that the SVG renders correctly in a non-browser environment,
 * which is critical for exported SVGs that will be opened in PowerPoint,
 * Keynote, Inkscape, etc.
 *
 * @param svgString - The SVG markup to render
 * @param width - Optional width to render at (defaults to SVG's intrinsic width)
 * @returns PNG image as a Buffer
 */
export function renderSVGtoPNG(svgString: string, width?: number): Buffer {
  const opts: Record<string, unknown> = {
    fitTo: width ? { mode: "width", value: width } : { mode: "original" },
    font: {
      // Use system fonts for text rendering
      loadSystemFonts: true,
    },
    logLevel: "off",
  }

  const resvg = new Resvg(svgString, opts)
  const rendered = resvg.render()
  return Buffer.from(rendered.asPng())
}
