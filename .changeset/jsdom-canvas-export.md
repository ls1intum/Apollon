---
"@tumaet/server": patch
---

Render text-sized diagrams correctly in the headless SVG/PDF export.

The server renders under jsdom, which has no canvas, so text measurement degraded to a crude estimate and text-sized diagrams (class, object, communication, sfc) came out with overlapping elements. The export now measures with a real Skia-backed canvas and the bundled Inter font, so node sizes match the editor across all diagram types — no browser required.

It also guards grading integrity: a submission containing glyphs outside the bundled font's coverage is logged (they would render in a fallback face that may not match the editor), and a node with missing or invalid dimensions is rejected with a `422` naming the node, instead of being silently given a default size.
