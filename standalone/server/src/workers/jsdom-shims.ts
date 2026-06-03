// JSDOM environment + the browser-API gaps that the apollon library hits
// during server-side SVG export. Importing this file installs the shims as
// module-evaluation side effects; import it before any code that touches
// `window`, `document`, or the apollon library.
import "global-jsdom/register"

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
