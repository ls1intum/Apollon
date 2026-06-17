---
"@tumaet/server": patch
---

fix(server): render text-sized diagrams correctly in the headless (jsdom) export

The server exports SVG/PDF under jsdom, which has no canvas, so `measureText`
fell back to a `text.length × 8` estimate and text-sized diagrams (class,
object, communication, sfc) came out with overlapping elements. Give jsdom a
real, Skia-backed canvas by aliasing the `canvas` package to `@napi-rs/canvas`
(prebuilt binaries, no system libraries) and registering the bundled Inter font
before the editor loads. Node widths now track the browser within one min-width
grid step across all 13 diagram types — no browser/Playwright required. The
worker also reports a Chromium `userAgent` so text wrapping matches the editor,
and fails loud at load if the canvas alias is ever broken (rather than silently
falling back to `text.length × 8` and misgrading exports).

Adds a worker-thread cross-type regression test that exports every diagram type,
checks geometry against the browser-authored widths, and verifies an overhanging
edge label widens the export clip (so messages are not cropped).

For grading integrity it also: warns when a submission contains glyphs outside
the bundled font's coverage (now Latin + Greek + Cyrillic + Vietnamese), since
those render in a fallback face that may not match the editor; and **fails loud**
on a node with missing/zero/NaN dimensions (a 422, naming the node) instead of
silently fabricating a 100×50 box that would misrepresent a graded submission.
