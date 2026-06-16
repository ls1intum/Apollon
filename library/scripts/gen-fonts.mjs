// Regenerate the bundled Inter woff2 subset shipped in lib/assets/fonts/.
//
// Subsets from the SAME Inter TTFs the visual-regression harness renders with
// (standalone/webapp/tests/fonts — Inter 4.001, git-9221beed3) so canvas
// measureText metrics stay byte-identical to what resvg draws — the basis of
// the determinism guarantee. Run: pnpm --filter @tumaet/apollon run gen:fonts
//
// The subset covers Latin + the few non-ASCII glyphs Apollon renders as SVG
// text (guillemets «» for stereotypes, the … overflow ellipsis, en/em dashes).
// Arbitrary user labels outside this range fall back to a system font; widen
// the ranges if a real diagram needs more.

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
  [0x100, 0x17f], // Latin Extended-A (accented latin)
  [0x2013, 0x2014], // en / em dash
  [0x2018, 0x201f], // smart quotes
  [0x2026, 0x2026], // horizontal ellipsis … (overflow truncation marker)
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
