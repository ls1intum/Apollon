---
"@tumaet/apollon": minor
---

fix: self-host Inter so diagrams render identically everywhere (no more headless-export overlaps)

Node geometry is sized from canvas `measureText`, but the library never shipped
the `Inter` family its font stack leads with — so rendering fell through to
`system-ui`, whose metrics differ between a desktop browser and a headless/CI
Chromium. That mismatch grew nodes past their saved positions and made exported
diagrams overlap (e.g. when rendering submission versions with Playwright).

Apollon now bundles a Latin + UML-symbol subset of Inter (weights 400/700) as an
`@font-face` inlined into `style.css`, pinning the measured metrics across the
editor, headless export, the server, and external SVG renderers. `compat`-mode
SVG exports additionally embed the font as a base64 `@font-face` (loaded lazily
so the main bundle is unaffected), so they render correctly when opened in a
browser, Inkscape, or PowerPoint.

The font stack is now a single exported `FONT_FAMILY` constant. New docs cover
[headless rendering](https://ls1intum.github.io/Apollon/library/api/headless-rendering)
end to end.
