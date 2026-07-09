import type { SVG } from "@tumaet/apollon"

/** Base64-encode bytes without blowing the call stack on a large image. */
function toBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

/**
 * Rasterize a rendered SVG to base64 PNG bytes for the host to write to disk.
 *
 * Rasterisation goes through the library's resvg (wasm) renderer, not an
 * `<img>` → `<canvas>` → `toBlob` pipeline: past the browser's canvas-area cap
 * (~16 MP on WebKit, ~268 MP on Chrome) `toBlob` yields `null` with no
 * exception, so a large diagram exports as a 0-byte file. resvg renders into its
 * own wasm buffer, where that cap does not exist.
 *
 * The renderer and its wasm binary are `import()`-ed on first export so they
 * stay out of the canvas's startup path. Vite resolves the wasm to a webview
 * asset URL; instantiating it needs `wasm-unsafe-eval` and fetching it needs
 * `connect-src` — see the CSP in `webviewHtml.ts`. `pngRenderer.ts` says why the
 * renderer is not imported from `@tumaet/apollon/export` directly.
 */
export async function renderSvgToPngBase64(rendered: SVG): Promise<string> {
  const [{ svgToPng }, { default: wasmUrl }] = await Promise.all([
    import("./pngRenderer"),
    import("@resvg/resvg-wasm/index_bg.wasm?url"),
  ])

  // PNG supports transparency, but a diagram on a transparent background is
  // unreadable in most viewers.
  const { blob } = await svgToPng(rendered.svg, rendered.clip, {
    background: "#ffffff",
    wasmInput: fetch(wasmUrl),
  })
  return toBase64(new Uint8Array(await blob.arrayBuffer()))
}
