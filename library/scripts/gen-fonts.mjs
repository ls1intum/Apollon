// Regenerate the bundled Inter woff2 subset shipped in lib/assets/fonts/.
//
// Subsets from the SAME Inter TTFs the visual-regression harness renders with
// (standalone/webapp/tests/fonts — Inter 4.001, git-9221beed3) so canvas
// measureText metrics stay byte-identical to what resvg draws — the basis of
// the determinism guarantee. Run: pnpm --filter @tumaet/apollon run gen:fonts
//
// The subset covers Latin + Greek + Cyrillic + Vietnamese (the scripts the
// server's full Inter TTF also renders, so editor and server agree), plus the
// punctuation Apollon emits (guillemets «», … ellipsis, en/em dashes). Labels
// in scripts Inter lacks (CJK, emoji, Arabic, Hebrew) fall back to a system
// font; the server warns on those (standalone server glyph-coverage.ts).
//
// Licensing: Inter's OFL header declares no Reserved Font Name, so this subset
// keeps the family name "Inter" (OFL clause 3 only restricts a declared RFN).
// The license text ships beside the font (LICENSE-InterFont, emitted by the
// Vite build) per OFL clause 2.

import subsetFont from "subset-font"
import { readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const SRC_DIR = resolve(here, "../../standalone/webapp/tests/fonts")
const OUT_DIR = resolve(here, "../lib/assets/fonts")

// Inter's own Google-Fonts subset ranges, so every codepoint maps to a real
// glyph (Greek/Cyrillic/Vietnamese cover the λ, Σ, Cyrillic identifiers common
// in CS/maths diagrams). Keep in lockstep with isCoveredCodePoint in
// standalone/server/src/services/glyph-coverage.ts, which owns the authenticity
// rationale and warns on anything outside.
const ranges = [
  [0x20, 0x7e], // Basic Latin
  [0xa0, 0xff], // Latin-1 Supplement (« » U+00AB/BB, ×, ÷, accented latin)
  [0x100, 0x17f], // Latin Extended-A
  [0x180, 0x24f], // Latin Extended-B (Vietnamese ư/ơ U+01AF/01A1, …)
  [0x300, 0x36f], // Combining diacritics (decomposed Vietnamese, accents)
  [0x370, 0x3ff], // Greek and Coptic (λ, Σ, α…)
  [0x400, 0x4ff], // Cyrillic (modern Russian/Ukrainian/…)
  [0x1e00, 0x1eff], // Latin Extended Additional (Vietnamese precomposed)
  [0x2013, 0x2014], // en / em dash
  [0x2018, 0x201f], // smart quotes
  [0x2026, 0x2026], // horizontal ellipsis … (overflow truncation marker)
]

let chars = ""
for (const [a, b] of ranges) {
  for (let c = a; c <= b; c++) chars += String.fromCodePoint(c)
}

// woff2 is base64-inlined into the editor's style.css for self-contained SVG
// exports; the truetype subset of the SAME source feeds @tumaet/apollon/export
// (resvg fontBuffers + jsPDF VFS, neither of which reads woff2). One source
// keeps exported PNG/PDF glyphs identical to what the editor measures/renders.
const fonts = ["Inter-Regular", "Inter-Bold"]

for (const name of fonts) {
  const buf = await readFile(resolve(SRC_DIR, `${name}.ttf`))
  for (const targetFormat of ["woff2", "truetype"]) {
    const ext = targetFormat === "truetype" ? "ttf" : "woff2"
    const subset = await subsetFont(buf, chars, { targetFormat })
    await writeFile(resolve(OUT_DIR, `${name}.${ext}`), subset)
    // eslint-disable-next-line no-console
    console.log(`${name}.${ext}: ${subset.length} bytes`)
  }
}
