# @tumaet/apollon

## 4.10.0

### Minor Changes

- [#759](https://github.com/ls1intum/Apollon/pull/759) [`e4a44f2`](https://github.com/ls1intum/Apollon/commit/e4a44f200c864e8684d01bf4113968c7dfc7fa96) Thanks [@FadyGergesRezk](https://github.com/FadyGergesRezk)! - Adds a public theming API for embedding hosts. You can now theme the editor with a typed helper instead of hand-writing CSS variables: `createApollonTheme()` maps a structured `ApollonTheme` (primary, background, grid, etc.) to the underlying `--apollon-*` custom properties, and `<Apollon>` accepts optional `theme` and `dataTheme` props (also available as `ApollonOptions` fields) that are applied to the editor mount node.

  ```ts
  import { Apollon, createApollonTheme } from "@tumaet/apollon/react"

  <Apollon theme={createApollonTheme({ primary: "#6d28d9", background: "#0b0b0c" })} dataTheme="dark" />
  ```

  The CSS custom-property contract remains the framework-agnostic source of truth (documented in `THEMING.md`); the helper is an ergonomic, type-safe wrapper over it. Un-themed embeds are unaffected.

- [#759](https://github.com/ls1intum/Apollon/pull/759) [`e4a44f2`](https://github.com/ls1intum/Apollon/commit/e4a44f200c864e8684d01bf4113968c7dfc7fa96) Thanks [@FadyGergesRezk](https://github.com/FadyGergesRezk)! - Removes MUI and Emotion from the editor. Its controls, popovers, toolbars, and minimap are rebuilt on lightweight Base UI primitives and styled entirely through the public `--apollon-*` CSS variables, so embedding hosts get a smaller dependency footprint, no Emotion runtime, and no MUI global-style collisions — with the editor's look and behaviour unchanged.

## 4.9.0

### Minor Changes

- [#773](https://github.com/ls1intum/Apollon/pull/773) [`8251733`](https://github.com/ls1intum/Apollon/commit/8251733a965e9fd3cd0beb7565e3abf138a895d5) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Adds swimlanes (activity partitions) to activity diagrams. Drop a swimlane from the sidebar, then add, remove, rename, or reorder its lanes and switch between vertical columns and horizontal rows from its edit popover. Drag a lane separator to resize the lanes. Activity elements dropped into a swimlane become its children and move with it; place each element under the lane for the role or system that performs that step.

- [#778](https://github.com/ls1intum/Apollon/pull/778) [`d03f562`](https://github.com/ls1intum/Apollon/commit/d03f562b3fabfc92e7cff870fe08061d678926f6) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Add a canvas overlay/control API so host applications can mount their own floating controls — toolbars, side panels, banners — directly inside the editor, in any corner or edge region. Registered chrome is collision-free and the diagram automatically makes room for it, so the canvas stays usable beneath it. The editor's built-in chrome (element palette, zoom/undo controls, minimap) is restyled onto one shared Liquid-Glass surface — translucent tint floor, backdrop blur, concentric radii and consistent elevation — that adapts to light and dark and honours reduced-transparency, increased-contrast and reduced-motion preferences. An untitled diagram now keeps an empty title (consumers can show their own placeholder) instead of being auto-named "Untitled Diagram".

- [#782](https://github.com/ls1intum/Apollon/pull/782) [`515777b`](https://github.com/ls1intum/Apollon/commit/515777ba6a45c0110adfa24c1fdb76251d0e9636) Thanks [@krusche](https://github.com/krusche)! - Two packaging improvements for embedding hosts. First, `yjs` and `y-protocols` are now required peer dependencies instead of being bundled, so your app and Apollon share a single Yjs instance — no duplicate payload and no cross-instance document errors. Second, a new `@tumaet/apollon/external` entry exposes the same imperative `ApollonEditor` API as the default entry but leaves **every** dependency external (React, MUI, emotion, xyflow, @dnd-kit, zustand, uuid, @chenglou/pretext, …) — so a bundler host of any framework resolves and de-duplicates each one from its own `node_modules` and gets full supply-chain / SBOM visibility, instead of a copy inlined invisibly into the bundle. The default `@tumaet/apollon` (self-contained) and `@tumaet/apollon/react` entries are unchanged. Action required only if you adopt the new entry or the Yjs peer: install the corresponding peers (most package managers do this automatically).

### Patch Changes

- [#645](https://github.com/ls1intum/Apollon/pull/645) [`2115fe3`](https://github.com/ls1intum/Apollon/commit/2115fe3d2c787a9055e6d9fbeab61a122eaaf6eb) Thanks [@tamang29](https://github.com/tamang29)! - Communication diagram message labels no longer overlap the edge line, and on vertical edges the two message directions now appear on the correct sides.

- [#777](https://github.com/ls1intum/Apollon/pull/777) [`295a627`](https://github.com/ls1intum/Apollon/commit/295a627e1067c0d23fd71ef3e26c8554a4a6e073) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Edge and interface labels now lay out neatly and consistently. Relationship and stereotype labels sit centered just above their edge and move to a clear arm and side when they would otherwise overlap the edge's own bends, a connected node, or another edge; role and multiplicity labels stay on the correct side of bent edges; and communication-diagram message arrows point the right way. Provided/required interface names in component and deployment diagrams now sit centered below the interface symbol (and wrap if long) instead of floating off its top-right corner, and automatically move to a clear side when an edge connects where the name would otherwise sit. Multi-word use-case actor names (e.g. "Premium Customer") now wrap below the figure instead of truncating. Labels are now placed identically in the editor and in PNG/PDF/SVG exports.

- [#783](https://github.com/ls1intum/Apollon/pull/783) [`451ca97`](https://github.com/ls1intum/Apollon/commit/451ca97872d1afb5478e628179151f7acc71aab7) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Activity-diagram lane separators now snap to the canvas grid while you drag them, matching how nodes and edge bends already snap. Lane boundaries line up cleanly instead of landing on arbitrary sub-pixel positions.

## 4.8.0

### Minor Changes

- [#766](https://github.com/ls1intum/Apollon/pull/766) [`5013fc6`](https://github.com/ls1intum/Apollon/commit/5013fc632ea0e18c9fce5baf1f66f1d50617a358) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Adds undo/redo to shared (collaborative) diagrams. Undo and redo now work during a collaboration session, scoped to each person's own edits — undo reverts only your own changes, never a teammate's, and never overwrites an element someone else is editing. A whole drag or resize counts as a single step, your selection comes back with the change you undo, and everyone keeps seeing each other's edits move in real time.

- [#675](https://github.com/ls1intum/Apollon/pull/675) [`1bb280d`](https://github.com/ls1intum/Apollon/commit/1bb280d23f9a4cfb9339a04b2311c1c50aeffae7) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Adds `@tumaet/apollon/export` — `svgToPng` and `svgToPdf` — for reliable in-browser PNG and vector-PDF export of an exported diagram SVG. The previous client approach rasterised through a `<canvas>`, which silently produced an empty PNG and a blurry, size-capped PDF once a diagram grew past the browser's canvas-area limit; these render off-canvas, so large diagrams export cleanly. `svgToPng` downscales a very large diagram to a pixel budget (reporting the applied scale) and throws `RasterTooLargeError` when it can't fit. Abstract-class names export upright, since the bundled Inter ships without an italic face.

### Patch Changes

- [#763](https://github.com/ls1intum/Apollon/pull/763) [`82942cd`](https://github.com/ls1intum/Apollon/commit/82942cddec7d3dd33711d3f38eba92e10c1da0c9) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Fixes the editor gradually slowing down and freezing during long single-user editing sessions. Repeatedly dragging or resizing nodes no longer makes the diagram progressively heavier until the tab locks up — the editor stays responsive, and undo/redo and live collaboration behave exactly as before. Lining up nodes with the alignment guides is also lighter on every drag, which most affected long sessions in Firefox.

- [#761](https://github.com/ls1intum/Apollon/pull/761) [`5d4a8dd`](https://github.com/ls1intum/Apollon/commit/5d4a8dd5d6d34d1c26d4258a99aadc02faca1c17) Thanks [@tamang29](https://github.com/tamang29)! - The editor palette, controls, and collaboration presence now adapt to compact portrait and landscape containers while respecting mobile safe areas.

## 4.7.0

### Minor Changes

- [#765](https://github.com/ls1intum/Apollon/pull/765) [`6fe657c`](https://github.com/ls1intum/Apollon/commit/6fe657cfabbb1f60936d03b758039fe1e7fade6f) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Headless and exported diagrams now render correctly and identically to the editor.

  - **Bundled Inter font.** The editor sizes diagram text by measuring it, but the library never shipped the Inter font it measures with — so it fell back to the host's `system-ui`, whose metrics differ between operating systems. That mismatch grew nodes past their saved positions and made exported diagrams overlap. Inter (Latin, Greek, Cyrillic, Vietnamese) now ships with the library, inlined into `style.css` (~+170 KB gzipped), pinning text geometry across the editor, exports, and external SVG renderers.
  - **Self-contained SVG export.** `ApollonEditor.exportModelAsSvg` now works in a headless browser without importing `@tumaet/apollon/style.css` — it brings the styling and font it needs. This fixes edges that could be drawn through node boxes and stops overhanging edge labels from being cropped. `compat`-mode exports embed the font so they open correctly in browsers, Inkscape, and PowerPoint.
  - **Published model JSON Schema ([#748](https://github.com/ls1intum/Apollon/issues/748)).** The diagram model is now a stable, versioned, documented contract, shipped at `@tumaet/apollon/schema`.
  - The font stack is exported as `FONT_FAMILY` for hosts that re-render or post-process diagram text.

  See the new [Headless rendering](https://ls1intum.github.io/Apollon/library/api/headless-rendering) guide and the [Model JSON contract](https://ls1intum.github.io/Apollon/library/api/model-contract).

- [#762](https://github.com/ls1intum/Apollon/pull/762) [`21c6f99`](https://github.com/ls1intum/Apollon/commit/21c6f9914b1ab24d79fa6f6d6527ca6260db8c43) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - feat: add `ApollonEditor.setElementHighlights()` for host-driven element highlighting

  Restores the per-element highlight capability that v3 exposed via the
  `UMLModelElement.highlight` field and `ApollonEditor.select()`, both of which
  were dropped in the v4 rewrite. Hosting apps (e.g. Artemis marking elements
  that are missing assessment feedback, or Athena marking elements that have
  automatic-feedback suggestions) can now call:

  ```ts
  editor.setElementHighlights(new Map([["element-id", "rgba(23,162,184,0.3)"]]))
  editor.setElementHighlights(null) // clear
  ```

  The highlight is a translucent overlay painted over each given node, edge, or
  class member id. It is an ephemeral view concern: it is not written into the
  model, not serialized by `get model`, and not shared with collaborators. A
  companion `getElementHighlights()` returns the current highlight record.

- [#764](https://github.com/ls1intum/Apollon/pull/764) [`1fc31cc`](https://github.com/ls1intum/Apollon/commit/1fc31cc7c1d2c8dedb3555edb5d5d063f572acae) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Upgrade to React 19 and enable the React Compiler.

  `@tumaet/apollon` now targets React 19 — its `react` and `react-dom` peer dependencies are `^19.0.0`. The `<Apollon>` component takes `ref` as a regular prop (the `forwardRef` wrapper was removed); consumers passing a `ref` need no changes. The React Compiler auto-memoizes the editor, so the manual `useMemo`/`useCallback`/`memo` and the hand-rolled stale-closure workarounds have been removed, and node/edge popovers anchor via a callback ref instead of reading a ref during render.

### Patch Changes

- [#765](https://github.com/ls1intum/Apollon/pull/765) [`6fe657c`](https://github.com/ls1intum/Apollon/commit/6fe657cfabbb1f60936d03b758039fe1e7fade6f) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Make the `compat` export render identically outside a browser (the standalone server, resvg, Inkscape, PowerPoint, macOS Preview), where it was previously corrupted in three ways. The fix is to fully resolve the SVG in one place — the library's `compat` export — instead of leaving browser-only features for downstream consumers to patch around:

  - **Cropped diagrams.** Under jsdom the off-screen editor reports a zero-size bounding rect, which the bounds math kept (`0 ?? fallback` evaluates to `0`) instead of falling back to each node's real width and height — so the export viewBox enclosed only node _positions_ and sliced off the rightmost and bottommost elements. A non-positive rect is now treated as unmeasured.
  - **Mangled class stereotypes.** Stereotype labels (`«interface»`, `«enumeration»`) used a relative `font-size` (`85%`) and cumulative `<tspan dy>` offsets — which browsers resolve but other renderers don't, so the guillemets ballooned over and overlapped the class name. Relative font sizes now resolve to absolute px and tspan offsets to absolute `y`.
  - **Mispositioned labels.** Node text is centred with `dominant-baseline`, which non-browser renderers ignore — drawing every label at the alphabetic baseline (too high). It's now resolved to an explicit `y`, so text lands where the editor puts it everywhere.

## 4.6.0

### Minor Changes

- [#742](https://github.com/ls1intum/Apollon/pull/742) [`dfb4479`](https://github.com/ls1intum/Apollon/commit/dfb4479bbf15671a6332c96b659efd9dd31c127b) Thanks [@tamang29](https://github.com/tamang29)! - The edge-type dropdown now shows a small preview of how each option renders — its real line style and arrowheads — so you can pick the right relationship at a glance, across class, component, deployment, use case, and BPMN diagrams.

### Patch Changes

- [#744](https://github.com/ls1intum/Apollon/pull/744) [`1fdb9bc`](https://github.com/ls1intum/Apollon/commit/1fdb9bc70b2fcfc119619876d595b36eebb36f8a) Thanks [@tamang29](https://github.com/tamang29)! - Fix live collaboration cursors showing up in the wrong place — or drifting outside the editor — when collaborators have different editor sizes (for example, when one has a side panel open). Remote cursors are now positioned relative to the modeling canvas instead of the browser window.

## 4.5.0

### Minor Changes

- [#709](https://github.com/ls1intum/Apollon/pull/709) Thanks [@tamang29](https://github.com/tamang29)! - The editor can now render live cursors, a presence bar, and remote selection highlights itself: pass a `collaboration` option with the local `user` instead of building that overlay in your host app. Also exports the `collabColorFromName` and `randomCollabName` helpers.

- [#706](https://github.com/ls1intum/Apollon/pull/706) Thanks [@tamang29](https://github.com/tamang29)! - Crossing edges now hop over one another (line jumps) instead of overlapping, keeping relationships readable in dense diagrams.

- [#710](https://github.com/ls1intum/Apollon/pull/710) Thanks [@FadyGergesRezk](https://github.com/FadyGergesRezk)! - Edge editing overhaul: bend handles move a single segment and snap to the grid, manually placed waypoints now survive endpoint reconnection (they were discarded before), the path updates live as you drag, and connection handles no longer overlap on short node sides or when zoomed out. Grid snapping is also finer (5px).

- [#681](https://github.com/ls1intum/Apollon/pull/681) Thanks [@tamang29](https://github.com/tamang29)! - Follow another participant's viewport during a live session — the editor recenters and tracks their pan and zoom. Exposed through the `collaboration` option (`showFollow`, `followingClientId`) and a new `CollaborationViewport` type.

- [#691](https://github.com/ls1intum/Apollon/pull/691) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Add a first-class React API and split the package into two entry points.

  - `@tumaet/apollon/react` exports an `<Apollon>` component plus `ApollonProvider`, `useApollonEditor`, `useApollonEditorOrThrow`, and `useApollonSubscription`. It treats `react`, `react-dom`, `@mui/material`, `@emotion/react`, `@emotion/styled`, and `@xyflow/react` as peer dependencies so a React host resolves a single shared copy.
  - The default `@tumaet/apollon` entry stays framework-agnostic and bundles those dependencies, so non-React hosts install with zero peers.

  **When upgrading:**

  - React hosts: import from `@tumaet/apollon/react` and add the six peers above to your own dependencies.
  - Minimum Node is now 22 (was 20).
  - Removed the `ApollonOptions` fields `theme`, `copyPasteToClipboard`, `colorEnabled`, and `scale`, and the `theme` argument of `exportModelAsSvg`.
  - Low-level sync internals (`YjsSync`, format converters) moved to `@tumaet/apollon/internals` and are not covered by semver.

### Patch Changes

- [#680](https://github.com/ls1intum/Apollon/pull/680) Thanks [@tamang29](https://github.com/tamang29)! - Alignment guides now favour the parent container when you drag near a nested element, instead of fighting with the children inside it — children still align among themselves.

- [#708](https://github.com/ls1intum/Apollon/pull/708) Thanks [@tamang29](https://github.com/tamang29)! - Pressing a node's toolbar button (Edit, Delete, …) no longer drags the canvas, so the toolbar works reliably on touch screens.

## 4.4.0

### Minor Changes

- [#663](https://github.com/ls1intum/Apollon/pull/663) Thanks [@tamang29](https://github.com/tamang29)! - Awareness API for live cursors and presence — subscribe to other clients' selection and cursor state, and broadcast your own.
- [#657](https://github.com/ls1intum/Apollon/pull/657) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Editor primitives for hosting a version-history UX without disturbing the live Yjs document — preview mode, programmatic readonly, fit-to-view, and full-state broadcast.
