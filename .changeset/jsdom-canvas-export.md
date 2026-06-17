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
grid step across all 13 diagram types — no browser/Playwright required.

Adds a worker-thread cross-type regression test that exports every diagram type
and checks geometry against the browser-authored widths.
