/**
 * Rasterise an Apollon compat-mode SVG to a PNG blob with resvg (Rust → wasm).
 *
 * The browser `<img>`→`<canvas>`→`toBlob` path silently fails past the canvas
 * area cap (~16 MP on iOS/WebKit, ~268 MP on Chrome): `toBlob` yields `null`
 * with no exception, so complex diagrams produced a 0-byte file (#667). resvg
 * renders into its own buffer in wasm linear memory, so the canvas cap never
 * applies; we cap the render area ourselves to bound peak memory.
 *
 * resvg, jspdf and svg2pdf are `optionalDependencies` lazily `import()`-ed here
 * so they never enter the editor bundle. The wasm binary and Inter fonts load
 * via Vite `?url` assets; non-Vite hosts inject them through `wasmInput` /
 * `fontBuffers`.
 */
import interBoldUrl from "@/assets/fonts/Inter-Bold.ttf?url"
import interRegularUrl from "@/assets/fonts/Inter-Regular.ttf?url"
import interItalicUrl from "@/assets/fonts/Inter-Italic.ttf?url"
import interBoldItalicUrl from "@/assets/fonts/Inter-BoldItalic.ttf?url"
import { DEFAULT_FONT_SIZE } from "@/fontStack"
import { RasterTooLargeError } from "./exportErrors"

/** 75 MP — well under the wasm32 4 GB ceiling at resvg's ~4× working set. */
const DEFAULT_MAX_AREA_PX = 75_000_000
/** Per-side cap; the area budget usually binds first. */
const DEFAULT_MAX_DIMENSION_PX = 16_384
/**
 * Hairline same-colour text stroke (em). resvg (tiny-skia) lays ~20% less ink
 * than a browser for the same Inter glyphs, so without this PNG text reads
 * thinner than the on-screen editor. Calibrated against the browser at weights
 * 400/700; identical to the server PNG path so both rasters match the editor.
 */
const STEM_DARKEN_EM = 0.0156

export type SvgToPngOptions = {
  /** Multiplier applied to the diagram clip dimensions. Default 1.5. */
  scale?: number
  /** CSS colour (e.g. "#ffffff") or null for transparent. Default null. */
  background?: string | null
  /** Override the 75 MP area budget. */
  maxAreaPx?: number
  /** Override the 16,384 px per-side cap. */
  maxDimensionPx?: number
  /**
   * The `@resvg/resvg-wasm` binary, as anything resvg's `initWasm` accepts.
   * Required: where the wasm lives is the host bundler's concern, not the
   * library's (resvg-wasm doesn't export it under a portable URL specifier).
   * In Vite:
   *   `import url from "@resvg/resvg-wasm/index_bg.wasm?url"`
   *   `svgToPng(svg, clip, { wasmInput: fetch(url) })`
   */
  wasmInput?: WebAssembly.Module | BufferSource | Response | Promise<Response>
  /** Font buffers (ttf/otf) to use instead of the bundled Inter. */
  fontBuffers?: Uint8Array[]
}

export type SvgToPngResult = {
  blob: Blob
  /** The scale actually used — below the requested one when clamped. */
  appliedScale: number
  clamped: boolean
  width: number
  height: number
}

/**
 * Largest scale that fits both the area budget and the per-side cap. Pure, so
 * the clamp can be unit-tested without booting wasm.
 */
export function computeAppliedScale(
  width: number,
  height: number,
  requestedScale: number,
  maxAreaPx: number,
  maxDimensionPx: number
): number {
  if (width <= 0 || height <= 0) return requestedScale
  return Math.min(
    requestedScale,
    Math.sqrt(maxAreaPx / (width * height)),
    maxDimensionPx / width,
    maxDimensionPx / height
  )
}

let wasmBoot: Promise<void> | null = null
let cachedFonts: Promise<Uint8Array[]> | null = null

async function ensureWasm(
  initWasm: (input: NonNullable<SvgToPngOptions["wasmInput"]>) => Promise<void>,
  wasmInput: SvgToPngOptions["wasmInput"]
): Promise<void> {
  if (!wasmInput) {
    throw new Error(
      "svgToPng requires opts.wasmInput (the @resvg/resvg-wasm binary). " +
        'In Vite: import url from "@resvg/resvg-wasm/index_bg.wasm?url"; ' +
        "svgToPng(svg, clip, { wasmInput: fetch(url) })."
    )
  }
  // initWasm() may run only once per realm ("Already initialized" otherwise),
  // so memoise the first boot; a failure resets it so a later call can retry.
  if (!wasmBoot) {
    wasmBoot = Promise.resolve(wasmInput)
      .then(initWasm)
      .catch((err) => {
        if (/already initialized/i.test(String(err))) return // another caller won
        wasmBoot = null
        throw err
      })
  }
  return wasmBoot
}

async function loadBundledFonts(): Promise<Uint8Array[]> {
  if (!cachedFonts) {
    cachedFonts = Promise.all(
      [interRegularUrl, interBoldUrl, interItalicUrl, interBoldItalicUrl].map(
        async (url) => {
          const res = await fetch(url)
          if (!res.ok)
            throw new Error(`Failed to load font ${url}: ${res.status}`)
          return new Uint8Array(await res.arrayBuffer())
        }
      )
    )
  }
  return cachedFonts
}

// The SVG spec's default text fill is black, applied when a <text> carries no
// explicit fill — resvg won't infer it, so we make the spec default explicit.
const SVG_DEFAULT_TEXT_FILL = "#000000"

/**
 * Prepare the SVG for resvg: add a same-colour hairline stroke to every
 * `<text>`/`<tspan>` (see STEM_DARKEN_EM). Returns the serialised SVG; mutates a
 * parsed clone, not the caller's string.
 */
function prepareSvgForRaster(svg: string): string {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  doc.querySelectorAll("text").forEach((text) => {
    const fill = text.getAttribute("fill") || SVG_DEFAULT_TEXT_FILL
    if (fill === "none") return
    const fontSize =
      parseFloat(text.getAttribute("font-size") ?? "") || DEFAULT_FONT_SIZE
    text.setAttribute("stroke", fill)
    text.setAttribute("paint-order", "stroke")
    text.setAttribute("stroke-linejoin", "round")
    text.setAttribute("stroke-width", String(STEM_DARKEN_EM * fontSize))
    text.querySelectorAll("tspan").forEach((tspan) => {
      const size = parseFloat(tspan.getAttribute("font-size") ?? "")
      if (size)
        tspan.setAttribute("stroke-width", String(STEM_DARKEN_EM * size))
    })
  })
  return new XMLSerializer().serializeToString(doc)
}

export async function svgToPng(
  svg: string,
  clip: { width: number; height: number },
  opts: SvgToPngOptions = {}
): Promise<SvgToPngResult> {
  const requestedScale = opts.scale ?? 1.5
  const maxAreaPx = opts.maxAreaPx ?? DEFAULT_MAX_AREA_PX
  const maxDimensionPx = opts.maxDimensionPx ?? DEFAULT_MAX_DIMENSION_PX
  const background = opts.background ?? null

  if (clip.width <= 0 || clip.height <= 0) {
    throw new RasterTooLargeError(
      `Diagram has zero or negative dimensions (${clip.width}x${clip.height}).`,
      clip.width,
      clip.height
    )
  }

  const appliedScale = computeAppliedScale(
    clip.width,
    clip.height,
    requestedScale,
    maxAreaPx,
    maxDimensionPx
  )
  const clamped = appliedScale < requestedScale

  const { initWasm, Resvg } = await import("@resvg/resvg-wasm")
  await ensureWasm(initWasm, opts.wasmInput)
  const fontBuffers = opts.fontBuffers ?? (await loadBundledFonts())

  let resvg: InstanceType<typeof Resvg> | undefined
  let rendered: ReturnType<InstanceType<typeof Resvg>["render"]> | undefined
  try {
    resvg = new Resvg(prepareSvgForRaster(svg), {
      fitTo: { mode: "zoom", value: appliedScale },
      // An explicit transparent rgba; omitting `background` leaves resvg's
      // anti-aliased edges painted black.
      background: background ?? "rgba(0,0,0,0)",
      font: {
        // No system fonts in the browser sandbox — hand resvg the bundled Inter
        // so every <text> renders (resvg does not synthesise faces, resvg#297).
        loadSystemFonts: false,
        fontBuffers,
        defaultFontFamily: "Inter",
      },
    })
    rendered = resvg.render()
    // Copy into a plain ArrayBuffer-backed array: resvg types the PNG as
    // Uint8Array<ArrayBufferLike>, which TS 5.7 won't accept as a BlobPart.
    const png = new Uint8Array(rendered.asPng())
    const { width, height } = rendered
    return {
      blob: new Blob([png], { type: "image/png" }),
      appliedScale,
      clamped,
      width,
      height,
    }
  } catch (err) {
    // A failed wasm memory growth surfaces as a RangeError; resvg's own
    // parse/render failures are plain Errors with descriptive messages. Key off
    // the type, not the message, so an unrelated error can't be mislabelled
    // "too large". The area budget above is the real guard; this only improves
    // the message on the rare device-memory failure at the clamp ceiling.
    if (err instanceof RangeError) {
      const cw = Math.round(clip.width * appliedScale)
      const ch = Math.round(clip.height * appliedScale)
      throw new RasterTooLargeError(
        `PNG render ran out of memory at ${cw}x${ch}: ${err.message}`,
        cw,
        ch
      )
    }
    throw err
  } finally {
    // Free wasm linear memory explicitly — it is not garbage-collected.
    rendered?.free()
    resvg?.free()
  }
}
