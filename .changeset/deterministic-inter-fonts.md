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

Headless edge-label fix: jsdom returns a zero `getBoundingClientRect` for SVG
text, so edge labels (communication messages, multiplicities) contributed
nothing to the export clip and an overhanging label was silently cropped. The
export now falls back to a `measureText`-based bound for edge text when the
screen rect is empty — rotating the box for rotated labels and using the right
asymmetric extent for alphabetic baselines — so labels are kept in the clip
(browser path unchanged).

The bundled Inter subset now also covers Greek, Cyrillic and Vietnamese (the
scripts the full Inter the server renders with already provides), so those
render deterministically in the editor and match the export instead of falling
back to a per-OS `system-ui` (~+64 KB gzipped in `style.css`; CJK/emoji/Arabic/
Hebrew are not in Inter and stay out). The published JSON Schema keeps element
`data` open (the correct forward-compatible contract) and a new test validates
every shipped fixture against it; a few drifted node types were loosened to
match the real serialized shapes.

Also publishes the diagram model JSON as a stable, versioned contract (#748): a
JSON Schema generated from the `UMLModel` type, shipped at
`@tumaet/apollon/schema` (and `unpkg.com/@tumaet/apollon/schema`) and documented
in [Model JSON contract](https://ls1intum.github.io/Apollon/library/api/model-contract),
with a versioning policy and a test that keeps the schema in sync with the
types. The schema is strict about the model envelope; per-element `data` is
documented as an open envelope (a full per-type discriminated union is tracked
as follow-up).
