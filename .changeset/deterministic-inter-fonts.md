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

Self-contained browser export (fixes edges routed through node boxes): a
consumer rendering headlessly in a real browser without importing
`@tumaet/apollon/style.css` got edges drawn through the node boxes. React Flow
positions Apollon's connection handles with an inline `left/top: "%"`, which
resolves only when `.react-flow__node` is `position: absolute` — a rule that
ships in React Flow's base CSS via `style.css`. Missing it, the handles
collapse to the node origin, React Flow measures them there on mount, and edges
route from the wrong points. `exportModelAsSvg` now injects the React Flow base
layout CSS and the Inter `@font-face` into its off-screen mount (a lazy chunk,
font-free so the main bundle is unaffected) and explicitly loads Inter before
measuring — so headless browser exports are correct and font-accurate with **no
`style.css` import required**. The jsdom/server path is unchanged (it pre-seeds
handles and has no layout engine, so the injected CSS is inert and exports stay
byte-stable).

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
back to a per-OS `system-ui` (~+170 KB gzipped in `style.css` — woff2 is already
Brotli-compressed, so inlining it adds roughly the raw woff2 size; CJK/emoji/
Arabic/Hebrew are not in Inter and stay out). The published JSON Schema keeps element
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
