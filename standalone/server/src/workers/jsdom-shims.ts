// JSDOM environment + the browser-API gaps that the apollon library hits
// during server-side SVG export. Importing this file installs the shims as
// module-evaluation side effects; import it before any code that touches
// `window`, `document`, or the apollon library.
// `canvas` is aliased to @napi-rs/canvas (see standalone/server/package.json);
// jsdom's HTMLCanvasElement resolves the same alias for getContext().
import { GlobalFonts } from "canvas"
import { fileURLToPath } from "node:url"
import "global-jsdom/register"
import { installSvgPathGeometry } from "./svgPathGeometry.js"

// @chenglou/pretext picks its line-break profile from `navigator.userAgent`
// (a non-Chromium UA changes CJK wrap points). Present as Chromium so wrapping
// matches the student's editor. Must precede the first measurement.
Object.defineProperty(window.navigator, "userAgent", {
  configurable: true,
  value:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
})

// Register the bundled Inter — the same TTFs the editor's woff2 is subset from
// (Inter 4.001) — so canvas `measureText` (and @chenglou/pretext's wrapping)
// size text-bearing nodes with the real font instead of jsdom's no-canvas
// `text.length * 8` fallback. Without this, class/object/communication
// diagrams overlap headlessly. MUST run before the apollon library is imported
// (textUtils captures its canvas context at module load).
const fontPath = (name: string) =>
  fileURLToPath(new URL(`../../assets/fonts/${name}`, import.meta.url))
GlobalFonts.registerFromPath(fontPath("Inter-Regular.ttf"), "Inter")
GlobalFonts.registerFromPath(fontPath("Inter-Bold.ttf"), "Inter")

// pretext probes `OffscreenCanvas` before `document.createElement('canvas')`.
// Only the latter routes through jsdom's `require("canvas")` alias, so force
// the document path by hiding any host-provided OffscreenCanvas (Node 24+).
;(globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = undefined

// Fail loud if the canvas alias is ever broken (missing/incompatible binary):
// otherwise getContext returns null and the editor silently falls back to the
// `text.length * 8` estimate, producing plausible-but-wrong — and silently
// misgraded — exports. A grading pipeline must crash here instead.
const probe = document.createElement("canvas").getContext("2d")
if (!probe || probe.measureText("Mg").width <= 0) {
  throw new Error(
    "[jsdom-shims] no real canvas: the `canvas` -> @napi-rs/canvas alias is not " +
      "resolving, so text measurement would fall back to text.length * 8 and " +
      "silently misgrade exports. Check standalone/server/package.json and the " +
      "installed @napi-rs/canvas prebuilt binary."
  )
}

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

// JSDOM ships no matchMedia. The editor's palette queries it for its compact
// (mobile) layout; headless there is no viewport, so every query is a
// non-matching, inert MediaQueryList — enough for the render to proceed.
w.matchMedia ??= ((query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList) as typeof window.matchMedia

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

// JSDOM has no geometry engine, so `getTotalLength` / `getPointAtLength` are
// unimplemented and throw. The library measures edge paths with them to place
// labels, toolbars, and decorators; without them every edge label lands at a
// fallback point off the line in the export. Reimplement them purely from the
// path `d` so the headless export positions labels exactly like the browser.
installSvgPathGeometry(window as Window)
