/**
 * `@tumaet/apollon/export` — reliable browser raster/vector export of a
 * compat-mode Apollon SVG. PNG via resvg (wasm); PDF via svg2pdf.js on jsPDF.
 * Both fix the canvas-area-cap silent failure of the old client path (#667).
 *
 * The heavy renderers (`@resvg/resvg-wasm`, `jspdf`, `svg2pdf.js`) are optional
 * dependencies, loaded lazily, so importing the editor never pulls them in.
 */
export { svgToPng, computeAppliedScale } from "./svgToPng"
export type { SvgToPngOptions, SvgToPngResult } from "./svgToPng"
export { svgToPdf } from "./svgToPdf"
export type { SvgToPdfOptions } from "./svgToPdf"
export { RasterTooLargeError } from "./exportErrors"
