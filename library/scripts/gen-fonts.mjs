// Regenerate the bundled Inter woff2 subset shipped in lib/assets/fonts/.
//
// Source of truth: the full Inter TTFs the visual-regression harness renders
// with (standalone/webapp/tests/fonts). Subsetting from the SAME files keeps
// the editor's canvas measureText metrics byte-identical to what resvg draws,
// which is what makes headless exports match the on-screen editor.
//
// Run:  pnpm --filter @tumaet/apollon run gen:fonts
//
// The subset covers Latin + Latin-1/Extended-A + the punctuation, dashes,
// quotes, ellipsis, arrows and math glyphs UML labels use (e.g. guillemets
// «» for stereotypes, the … overflow ellipsis). Widen the ranges below if a
// real diagram needs a glyph that currently falls back to a system font.

import subsetFont from "subset-font"
import { readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const SRC_DIR = resolve(here, "../../standalone/webapp/tests/fonts")
const OUT_DIR = resolve(here, "../lib/assets/fonts")

const ranges = [
  [0x20, 0x7e], // Basic Latin (printable ASCII)
  [0xa0, 0xff], // Latin-1 Supplement (« » U+00AB/BB, ×, ÷, accented latin)
  [0x100, 0x17f], // Latin Extended-A
  [0x2013, 0x2014], // en / em dash
  [0x2018, 0x201f], // smart quotes
  [0x2026, 0x2026], // horizontal ellipsis … (overflow truncation marker)
  [0x2190, 0x21ff], // arrows
  [0x2200, 0x22ff], // mathematical operators
]

let chars = ""
for (const [a, b] of ranges) {
  for (let c = a; c <= b; c++) chars += String.fromCodePoint(c)
}

const fonts = [
  ["Inter-Regular.ttf", "Inter-Regular.woff2"],
  ["Inter-Bold.ttf", "Inter-Bold.woff2"],
]

for (const [src, out] of fonts) {
  const buf = await readFile(resolve(SRC_DIR, src))
  const subset = await subsetFont(buf, chars, { targetFormat: "woff2" })
  await writeFile(resolve(OUT_DIR, out), subset)
  // eslint-disable-next-line no-console
  console.log(`${out}: ${subset.length} bytes`)
}
