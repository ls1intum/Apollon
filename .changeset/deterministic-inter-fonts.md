---
"@tumaet/apollon": minor
---

fix: self-host Inter so diagrams render identically everywhere (no more headless-export overlaps)

Node geometry is sized from canvas `measureText`, but the library never shipped
the `Inter` family its font stack leads with — so rendering fell through to
`system-ui`, whose metrics differ between a desktop browser and a headless/CI
Chromium. That mismatch grew nodes past their saved positions and made exported
diagrams overlap (e.g. when rendering submission versions with Playwright).

Apollon now bundles a Latin subset of Inter (weights 400/700) as an
`@font-face` inlined into `style.css`, pinning the measured metrics across the
editor, headless export, the server, and external SVG renderers. `compat`-mode
SVG exports additionally embed the font as a base64 `@font-face` (loaded lazily
so the main bundle is unaffected), so they render correctly when opened in a
browser, Inkscape, or PowerPoint.

The font stack is now a single exported `FONT_FAMILY` constant. New docs cover
[headless rendering](https://ls1intum.github.io/Apollon/library/api/headless-rendering)
end to end.

Also publishes the diagram model JSON as a stable, versioned contract (#748): a
JSON Schema generated from the `UMLModel` type, shipped at
`@tumaet/apollon/schema` (and `unpkg.com/@tumaet/apollon/schema`) and documented
in [Model JSON contract](https://ls1intum.github.io/Apollon/library/api/model-contract),
with a versioning policy and a test that keeps the schema in sync with the
types. The schema is strict about the model envelope; per-element `data` is
documented as an open envelope (a full per-type discriminated union is tracked
as follow-up).
