/**
 * Register the bundled Inter family with a jsPDF instance so svg2pdf.js can
 * render every font weight + style Apollon's compat-mode SVG emits.
 *
 * Why this matters: jsPDF ships with the 14 PDF Type-1 standard fonts (only
 * Helvetica regular + bold + oblique, no semibold/medium). svg2pdf.js looks
 * up `(family, weight + style)` exactly; if `(Inter, "600normal")` isn't
 * registered, svg2pdf silently *drops* the text — which is exactly how
 * stereotype labels («Interface», «Abstract», «Enumeration», "Package",
 * "Legend") disappeared from PDF exports before this fix.
 *
 * We register at the four canonical combinations that Apollon uses and
 * alias semibold (600) onto Bold so it renders without bundling a fifth
 * file (visually almost identical at body sizes).
 */
import type jsPDFType from "jspdf"

import interRegularUrl from "@/workers/fonts/Inter-Regular.ttf?url"
import interBoldUrl from "@/workers/fonts/Inter-Bold.ttf?url"
import interItalicUrl from "@/workers/fonts/Inter-Italic.ttf?url"
import interBoldItalicUrl from "@/workers/fonts/Inter-BoldItalic.ttf?url"

type RegisterInput = {
  url: string
  vfsName: string
  /** jsPDF style key. Typical: "normal" | "italic". */
  style: "normal" | "italic"
  /** Numeric weight as string (jsPDF accepts both numeric and "bold"). */
  weights: string[]
}

const FONT_FACES: ReadonlyArray<RegisterInput> = [
  {
    url: interRegularUrl,
    vfsName: "Inter-Regular.ttf",
    style: "normal",
    weights: ["400", "normal"],
  },
  {
    url: interBoldUrl,
    vfsName: "Inter-Bold.ttf",
    style: "normal",
    // Alias 600 (semibold) to Bold — Apollon uses 600 for "Package"/"Legend"
    // headers and we don't bundle a real semibold variant.
    weights: ["600", "700", "bold"],
  },
  {
    url: interItalicUrl,
    vfsName: "Inter-Italic.ttf",
    style: "italic",
    weights: ["400", "normal"],
  },
  {
    url: interBoldItalicUrl,
    vfsName: "Inter-BoldItalic.ttf",
    style: "italic",
    weights: ["600", "700", "bold"],
  },
]

let cachedFontDataUris: Map<string, string> | null = null

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch font ${url}: ${res.status}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  // Browser-safe base64 — `btoa` rejects non-Latin-1, so go through binary
  // string the long way.
  let binary = ""
  const CHUNK = 0x8000
  for (let i = 0; i < buf.length; i += CHUNK) {
    binary += String.fromCharCode(...buf.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export async function registerInterFonts(
  pdf: InstanceType<typeof jsPDFType>
): Promise<void> {
  if (!cachedFontDataUris) {
    const entries = await Promise.all(
      FONT_FACES.map(
        async (face) => [face.url, await fetchAsBase64(face.url)] as const
      )
    )
    cachedFontDataUris = new Map(entries)
  }
  for (const face of FONT_FACES) {
    const base64 = cachedFontDataUris.get(face.url)!
    pdf.addFileToVFS(face.vfsName, base64)
    for (const weight of face.weights) {
      pdf.addFont(face.vfsName, "Inter", face.style, weight)
    }
  }
}
