/// <reference lib="webworker" />
/**
 * Web-Worker that rasterises SVG to PNG via resvg (Rust → WebAssembly).
 *
 * Why not the browser's `<img>` → `<canvas>` pipeline? Browsers cap canvas
 * dimensions (Chrome ~32,767 px / 268 MP, Safari/iOS only ~16 MP) — bigger
 * diagrams either silently produce a 0-byte file or throw. resvg renders into
 * its own pixel buffer in linear memory and emits a PNG byte-stream, so the
 * browser canvas cap never enters the picture.
 *
 * Fonts: resvg-wasm has no system-font access (browser sandbox). We bundle
 * Inter Regular + Bold (the same font Apollon uses on screen, SIL OFL) and
 * pass their buffers to every render. Without this, every `<text>` element
 * would render empty — a silent quality regression.
 *
 * The wasm and the fonts are initialised lazily on the first message and
 * cached, so repeated exports pay the boot cost once per worker generation.
 */
import { initWasm, Resvg } from "@resvg/resvg-wasm"
import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url"
import interRegularUrl from "./fonts/Inter-Regular.ttf?url"
import interBoldUrl from "./fonts/Inter-Bold.ttf?url"

// Narrow the worker's global to the dedicated-worker variant so postMessage's
// transferable overload type-checks without a cast.
declare const self: DedicatedWorkerGlobalScope & typeof globalThis

export type SvgToPngWorkerRequest = {
  type: "render"
  id: string
  svg: string
  scale: number
  background: string | null
}

export type SvgToPngWorkerResponse =
  | {
      type: "rendered"
      id: string
      png: Uint8Array
      width: number
      height: number
    }
  | {
      type: "error"
      id: string
      error: { name: string; message: string }
    }

let bootPromise: Promise<{ fontBuffers: Uint8Array[] }> | null = null

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`)
  }
  return new Uint8Array(await res.arrayBuffer())
}

function ensureInitialised() {
  if (bootPromise) return bootPromise
  bootPromise = (async () => {
    try {
      const [, regular, bold] = await Promise.all([
        initWasm(fetch(wasmUrl)),
        fetchBytes(interRegularUrl),
        fetchBytes(interBoldUrl),
      ])
      return { fontBuffers: [regular, bold] }
    } catch (err) {
      // Reset so a later retry can attempt re-init (e.g. transient fetch failure).
      bootPromise = null
      throw err
    }
  })()
  return bootPromise
}

self.onmessage = async (event: MessageEvent<SvgToPngWorkerRequest>) => {
  const req = event.data
  if (req.type !== "render") return
  const { id, svg, scale, background } = req
  try {
    const { fontBuffers } = await ensureInitialised()

    const resvg = new Resvg(svg, {
      fitTo: { mode: "zoom", value: scale },
      // Pass an explicit transparent rgba when the caller wants no background;
      // omitting `background` leaves resvg's anti-alias edges painted black.
      background: background ?? "rgba(0,0,0,0)",
      font: {
        // resvg-wasm has no access to system fonts in the browser sandbox.
        // Hand it the bundled Inter family so <text> renders correctly.
        loadSystemFonts: false,
        fontBuffers,
        defaultFontFamily: "Inter",
      },
    })
    const rendered = resvg.render()
    const png = rendered.asPng()
    const width = rendered.width
    const height = rendered.height
    rendered.free()
    resvg.free()

    const response: SvgToPngWorkerResponse = {
      type: "rendered",
      id,
      png,
      width,
      height,
    }
    // Transfer the underlying ArrayBuffer to avoid copying the PNG bytes.
    self.postMessage(response, [png.buffer])
  } catch (err) {
    const response: SvgToPngWorkerResponse = {
      type: "error",
      id,
      error: {
        name: (err as Error)?.name ?? "Error",
        message: (err as Error)?.message ?? String(err),
      },
    }
    self.postMessage(response)
  }
}
