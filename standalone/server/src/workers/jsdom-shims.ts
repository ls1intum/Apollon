// JSDOM environment + the browser-API gaps that the apollon library hits
// during server-side SVG export. Importing this file installs the shims as
// module-evaluation side effects; import it before any code that touches
// `window`, `document`, or the apollon library.
// `canvas` is aliased to @napi-rs/canvas (see standalone/server/package.json);
// jsdom's HTMLCanvasElement resolves the same alias for getContext().
import { GlobalFonts } from "canvas"
import { fileURLToPath } from "node:url"
import "global-jsdom/register"

// Register the bundled Inter — the same TTFs the editor's woff2 is subset from
// (Inter 4.001) — so canvas `measureText` (and @chenglou/pretext's wrapping)
// size text-bearing nodes with the real font instead of jsdom's no-canvas
// `text.length * 8` fallback. Without this, class/object/communication
// diagrams overlap headlessly. The `canvas` alias to @napi-rs/canvas (Skia) is
// in pnpm-workspace.yaml; Skia's metrics match the browser closely enough that
// node widths stay within their authored sizes. MUST run before the apollon
// library is imported (textUtils captures its canvas context at module load).
const fontPath = (name: string) =>
  fileURLToPath(new URL(`../../assets/fonts/${name}`, import.meta.url))
GlobalFonts.registerFromPath(fontPath("Inter-Regular.ttf"), "Inter")
GlobalFonts.registerFromPath(fontPath("Inter-Bold.ttf"), "Inter")

// pretext probes `OffscreenCanvas` before `document.createElement('canvas')`.
// Only the latter routes through jsdom's `require("canvas")` alias, so force
// the document path by hiding any host-provided OffscreenCanvas (Node 24+).
;(globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = undefined

class ResizeObserverShim {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const w = window as Window & typeof globalThis
const g = globalThis as typeof globalThis & { ResizeObserver?: unknown }

g.ResizeObserver ??= ResizeObserverShim
w.requestAnimationFrame ??= (cb: FrameRequestCallback) =>
  setTimeout(() => cb(Date.now()), 16) as unknown as number
w.cancelAnimationFrame ??= (id: number) => clearTimeout(id)

// JSDOM ships a constant (0,0,10,10) stub for SVGGraphicsElement.getBBox,
// which collapses every node into a 10×10 box at origin and frames the
// exported viewBox around empty space. Read the element's own `viewBox`
// (which the library sets on every shape) instead.
;(
  window.SVGElement.prototype as unknown as { getBBox: () => DOMRect }
).getBBox = function () {
  const el = this as unknown as Element
  const vb = el.getAttribute?.("viewBox")
  if (vb) {
    const [x, y, width, height] = vb.split(/[\s,]+/).map(Number)
    if ([x, y, width, height].every((n) => Number.isFinite(n))) {
      return { x, y, width, height } as DOMRect
    }
  }
  const width = parseFloat(el.getAttribute?.("width") ?? "")
  const height = parseFloat(el.getAttribute?.("height") ?? "")
  return {
    x: 0,
    y: 0,
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0,
  } as DOMRect
}
