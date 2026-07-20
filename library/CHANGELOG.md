# @tumaet/apollon

## 5.2.0

### Minor Changes

- [#822](https://github.com/ls1intum/Apollon/pull/822) [`1ed1d1e`](https://github.com/ls1intum/Apollon/commit/1ed1d1e002dcf91bbfc770dec1cfff1a673f1591) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Tap a palette element to place it. Clicking (or tapping) an element in the palette now drops it in the centre of the visible canvas and selects it, instead of leaving it hidden underneath the palette. Dragging still places the element exactly where you drop it. Placing several elements in a row cascades them diagonally so they never stack on top of one another, and palette entries are now keyboard-operable — focus one and press Enter or Space to add it.

- [#817](https://github.com/ls1intum/Apollon/pull/817) [`5d90428`](https://github.com/ls1intum/Apollon/commit/5d9042806b5052c68722c323bc0475488c459568) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Duplicates the selection with Ctrl/Cmd+D — edges between the duplicated elements included — and puts the viewport on the keyboard: Ctrl/Cmd+= and Ctrl/Cmd+- to zoom, Ctrl/Cmd+0 for 100%, Ctrl/Cmd+Shift+1 and Ctrl/Cmd+Shift+2 to fit the diagram or the selection. Esc still clears the selection, which Ctrl/Cmd+D used to do. Zooming, copying and selecting now work on a read-only diagram, shortcuts stay out of open dialogs and half-typed IME characters, and holding a key repeats only undo, redo and zoom.

  For embedders: `APOLLON_SHORTCUTS` lists every key the editor consumes, alongside `matchesShortcutCombo`, `isTypingTarget`, `isInsideOverlay` and `shortcutKeyName` — enough to render a shortcut sheet that tracks the editor, or to bind your own keys under the same rules. Pass `keyboardShortcuts: false` to keep the editor off the keyboard entirely.

- [#816](https://github.com/ls1intum/Apollon/pull/816) [`1eaf5be`](https://github.com/ls1intum/Apollon/commit/1eaf5be6a4a7e69c3fc40f79a247b5d7c731caf4) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Adds element tags — short labels you attach to a class, an attribute, or a method, where many elements can share the same one. Tag every member a programming test covers, then ask the editor for that tag with `editor.getElementIdsByTag("testAttributes[Context]")` and hand the result straight to `setElementHighlights`. That is enough to repaint a sample solution green, red, or grey from each build result, so the same diagram can show a different picture to every student without the saved model ever changing.

  Tag authoring is off by default and enabled with the new `tags` option: `true` for free-form tags, or an object to offer a fixed vocabulary (`available`) and decide whether users may create their own (`allowCreate`). A host can also set tags without the UI via `editor.setElementTags(id, tags)`. When enabled, each class, attribute, and method gets a tag button beside its color control that opens a tag picker, and its tags show as removable chips under the row. Colors are now edited in a popover too, so the edit panel no longer grows inline. Tags are part of the diagram, so they survive export, import, and copy/paste — and a diagram with no tags is untouched.

- [#819](https://github.com/ls1intum/Apollon/pull/819) [`cec0a4c`](https://github.com/ls1intum/Apollon/commit/cec0a4c895fc361bba203f5f2931447b5494e7e1) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Select and move several elements at once: a new multi-select toggle in the canvas controls lets you build a selection by clicking or tapping elements to add or remove them — and, with a mouse, by dragging a selection box across the canvas. It needs no keyboard, so groups can be positioned together on phones and tablets too. Click empty canvas or press Escape to clear.

### Patch Changes

- [#827](https://github.com/ls1intum/Apollon/pull/827) [`f7fd4a5`](https://github.com/ls1intum/Apollon/commit/f7fd4a58f32aec0b8442ba501d9304d2f98b5983) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Keep the zoom, undo and minimap controls pinned to the bottom of the canvas in embedded editors. An editor mounted below the fold mistook the gap between its bottom edge and the window for an on-screen keyboard and reserved that whole gap as padding, stranding the controls mid-diagram — and scrolling the editor into view never cleared it. The editor now reserves only the part of the canvas a keyboard actually covers.

- [#818](https://github.com/ls1intum/Apollon/pull/818) [`75769ce`](https://github.com/ls1intum/Apollon/commit/75769ce4010707154d5dc7dd94b0bad4cb069965) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Fixed resize handles across every node. Borders that can't resize no longer show a resize cursor — a class's height is driven by its attributes and methods, so its top and bottom borders used to offer a vertical-resize cursor and a drag that did nothing. Content-sized nodes keep their corner handles and resize only along the axis that can change. And on filled nodes such as activity swimlanes, the edge you drag to resize is now grabbable instead of hiding behind the node — previously only the corners worked.

- [#827](https://github.com/ls1intum/Apollon/pull/827) [`f7fd4a5`](https://github.com/ls1intum/Apollon/commit/f7fd4a58f32aec0b8442ba501d9304d2f98b5983) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Stop repainting the host page's borders. Importing the editor's `style.css` reset the border colour of every element on the page, so the host's own inputs, selects, buttons and fieldsets lost the browser's neutral grey and took on the surrounding text colour — near-black on a light page, stark white on a dark one. The reset now applies only to the editor's own controls.

- [#824](https://github.com/ls1intum/Apollon/pull/824) [`512affe`](https://github.com/ls1intum/Apollon/commit/512affe3d3c8abb258da832bff6b800dcfaacb89) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Stop mutating the host page's color scheme. `style.css` declared `color-scheme: light dark` on `:root`, so any host that imports the editor CSS and leaves its own `html`/`body` backgrounds transparent (the Docusaurus docs site does) rendered a browser-picked dark canvas behind light-themed text for dark-preference visitors. The declaration is now scoped to the editor mount and `[data-theme]` subtrees; host pages keep full control of their document root.

- [#825](https://github.com/ls1intum/Apollon/pull/825) [`cd5b5f1`](https://github.com/ls1intum/Apollon/commit/cd5b5f1f5465763e4c966c8286045c635d121c3d) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Correct the install guidance on the npm README: `npm install @tumaet/apollon` is all npm 7+, pnpm 8+, and Bun need (they auto-install the required peers); the explicit peer list is only for Yarn, which never installs peers. Also clarify that the PNG/PDF renderers are optional dependencies that install automatically, not "optional peers" the consumer must add.

- [#823](https://github.com/ls1intum/Apollon/pull/823) [`3f37c97`](https://github.com/ls1intum/Apollon/commit/3f37c97b0a8b159ff896e2acbc43cf536936d533) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Polish the npm README: an editor screenshot in a browser-window frame plus "Try the live demo" / "Documentation" buttons, so the package page shows the product, not just badges. All images are generated from the live editor by the `readme-assets` Playwright project and hosted from the repository, using npm-safe plain markdown images (npmjs.com strips GitHub's `<picture>` theme swap and img sizing attributes).

## 5.1.1

### Patch Changes

- [#806](https://github.com/ls1intum/Apollon/pull/806) [`ecad49e`](https://github.com/ls1intum/Apollon/commit/ecad49ea7c88e0e4c90994bab37d9d80efef2712) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Fixes diagram content being framed behind the notch, Dynamic Island, or home indicator on a phone. Fitting the view now keeps every node clear of the device's safe area on all four edges, whether or not any editor chrome sits there.

  The zoom cluster now also honours the reduced-transparency and increased-contrast system settings, and floating chrome uses a lighter backdrop blur on touch devices, where the blur cost the most and showed the least.

- [#806](https://github.com/ls1intum/Apollon/pull/806) [`ecad49e`](https://github.com/ls1intum/Apollon/commit/ecad49ea7c88e0e4c90994bab37d9d80efef2712) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Keep the palette drag ghost themed when the editor is themed by its own mount node. The ghost portals to `document.body` to track the cursor in viewport coordinates, which put it outside the subtree that scopes the editor's tokens — so `<Apollon dataTheme="dark">` dragged a light-on-white shape across a dark canvas. It now carries the theme it was grabbed under, whether that came from `dataTheme`, from a `theme` override, or from a host stylesheet. Hosts that theme the document root were never affected.

- [#806](https://github.com/ls1intum/Apollon/pull/806) [`ecad49e`](https://github.com/ls1intum/Apollon/commit/ecad49ea7c88e0e4c90994bab37d9d80efef2712) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Fix reachability-graph and syntax-tree popover titles repeating the diagram name. Selecting a marking said "Reachability Graph Marking" and a nonterminal said "Syntax Tree Nonterminal", where every other diagram shows the bare element name.

- [#806](https://github.com/ls1intum/Apollon/pull/806) [`ecad49e`](https://github.com/ls1intum/Apollon/commit/ecad49ea7c88e0e4c90994bab37d9d80efef2712) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Fix form controls and portaled popups ignoring a scoped theme.

  Three separate causes, all of which only showed up when `data-theme` sits on the editor's own mount node rather than the document root:

  - The `--home-*` aliases the shared input/select/button primitives paint from were declared only on `:root`, so they resolved against the document's light base and merely inherited the computed value. A dark embed drew light input borders and light placeholder ink. They are now re-declared on `.apollon-editor`, like the chrome ramp.
  - Text fields inherited nothing and fell through to the UA's `color: fieldtext`, a system color keyed to `color-scheme` — i.e. the OS appearance, not the editor's theme. A light editor on a dark desktop rendered white text in its inputs. `[data-slot="input"]` and `[data-slot="textarea"]` now reset `color` to `inherit`.
  - Body-portaled popups copy resolved token values, but never recomputed them, so a theme switch left an open menu — and every later one anchored to the same element — painting the old palette. They now subscribe to theme changes.

## 5.1.0

### Minor Changes

- [#799](https://github.com/ls1intum/Apollon/pull/799) [`8905b71`](https://github.com/ls1intum/Apollon/commit/8905b714f4815e5ade163e9144b424b97f13859c) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Fix UML class-diagram notation and let methods be marked abstract.

  - **Abstract is now UML-correct.** An abstract class shows an _italic_ name instead of the invalid `«Abstract»` keyword — UML has no `«abstract»` keyword; abstractness is a property, not a stereotype (UML 2.5.1 §9.2.4). The italic is a real shipped Inter italic face, so it renders the same in the editor and in PNG, PDF, and PowerPoint exports — no more `{abstract}` text fallback for a slant that used to vanish on export.
  - **Metaclass keywords are lowercase.** Interfaces and enumerations render `«interface»` / `«enumeration»` — the exact UML keyword spelling (2.5.1 Table C.1) — instead of the capitalized forms.
  - **New: abstract methods.** Mark any method abstract from the class editor (a per-method toggle) to render its signature in italics. Attributes are deliberately not offered the control: UML attributes cannot be abstract. Closes [#105](https://github.com/ls1intum/Apollon/issues/105).
  - **A single "Class type" picker.** The class editor now sets the classifier with one dropdown — `Class`, `Abstract Class`, `Interface`, `Enumeration` — mirroring the four palette tiles and the other node/edge "type" selects, with a notation preview on each option. It replaces a checkbox-plus-toggle pair that could produce invalid states (an italic `«interface»`, or an abstract enumeration); those states are now unrepresentable, and any earlier diagram carrying one self-heals on load.

  Diagrams saved earlier migrate automatically on load — a class stored with the old `"Abstract"` stereotype becomes `isAbstract`, `"Interface"` / `"Enumeration"` are lowercased to their keyword spelling, and a stray abstract modifier on a keyword is dropped.

- [#800](https://github.com/ls1intum/Apollon/pull/800) [`930b10c`](https://github.com/ls1intum/Apollon/commit/930b10c2fbf3e7c4b5c8b5afe5b430c44700dbf7) Thanks [@tamang29](https://github.com/tamang29)! - Place and reconnect edge endpoints anywhere along a node's border, snapping to the grid, with a drag handle for moving an endpoint. Endpoints attach to each node's real shape rather than its bounding box and match the handles a node shows: use-case ovals connect along their curve, the flowchart input/output parallelogram along its slanted outline, and round or diamond nodes — activity start/end, BPMN events and gateways, flowchart decisions, petri places, and component/deployment interfaces — at their four N/E/S/W points. Legends, annotations, and swimlanes are not connection targets, and endpoints can be reconnected onto container nodes (activity, package, pool, subsystem). Drawing a connection shows a dashed preview that lands exactly where the edge will attach, dragging an endpoint across empty canvas follows the cursor instead of snapping back, connection arcs respond as soon as you reach them, and a connection attaches to the nearest node when several sit close together.

- [#795](https://github.com/ls1intum/Apollon/pull/795) [`cba2d71`](https://github.com/ls1intum/Apollon/commit/cba2d7113457a8df4e3337a72d1574b79a33690c) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Reshape and fix the editor theming API.

  **New: `primaryForeground`.** `ApollonTheme.primaryForeground` (CSS var `--apollon-primary-foreground`) sets the ink drawn on `primary` — accent buttons, the active tool — and defaults to white. Set it to a dark value when your `primary` is light, so on-accent text stays legible instead of white-on-light.

  **Fixed: scoped theming now covers the whole editor.** With a scoped `dataTheme="dark"` (or an inline `theme` override on the mount node), the in-canvas glass chrome and many surfaces previously stayed frozen in light mode — `surface` / `border` / `secondary` / `danger` / `grid` / swatches / assessment / collaboration colors, plus every popup that portals out of the editor (menus, selects, tooltips, and the element color picker). They now re-resolve against the scoped mount, so an editor themed dark on a light page is fully dark. Document-root dark (`data-theme` on `<html>`) was already correct and is unchanged.

  **Reshaped the typed API.** `primaryContrast` → `foreground` (CSS var `--apollon-primary-contrast` → `--apollon-foreground`) and the danger CSS var `--apollon-alert-danger-color` → `--apollon-danger`; `foreground` is the page ink drawn on `background`, so the old name misled. Eleven never-painted Bootstrap-era fields (`backgroundInverse`, `warning` / `warningBackground` / `warningBorder`, `dangerBackground` / `dangerBorder`, `switchBoxBorderColor`, `listGroupColor`, `btnOutlineSecondaryColor`, `modalBottomBorder`, `surfaceHover`) were removed — the Base UI editor never painted them. The typed API is new and has no external consumers, so these ship as a minor rather than a major: un-themed embeds are unaffected, and a typed embed gets a compile error on any renamed/removed key. Theme `primary` + `background` + `foreground` and the chrome derives the rest (add `primaryForeground` if `primary` is light); see `THEMING.md`.

- [#798](https://github.com/ls1intum/Apollon/pull/798) [`9c4782c`](https://github.com/ls1intum/Apollon/commit/9c4782c639d051100440f1141bde877ae8d4928a) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Embedding apps can now compose Apollon's built-in editor controls instead of accepting fixed chrome. Use `<Apollon.Palette />`, `<Apollon.Zoom />`, `<Apollon.MiniMap />`, or `<ApollonDefaultControls />` as `<Apollon>` children to keep, move, configure, hide, or replace the palette, zoom/history controls, and minimap.

  Imperative hosts can configure the same controls with `paletteControl()`, `zoomControl()`, `miniMapControl()`, and `defaultControls()`. Omitting `controls` keeps the default chrome, passing `[]` renders a bare canvas, and `addControl` / `updateControl` / `removeControl` manage custom or built-in controls at runtime.

  Localize the editor’s own tooltips, aria labels, and edit/assessment popovers through `labels`, `editor.setLabels(...)`, and `useLabels()`. Built-in and custom controls now stay clear of each other and keep diagram content visible across responsive layouts.

### Patch Changes

- [#805](https://github.com/ls1intum/Apollon/pull/805) [`e108b79`](https://github.com/ls1intum/Apollon/commit/e108b79955d159104db6809077ca4d7255ae1a20) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Aggregation and composition diamonds in class diagrams are now large enough to read at a glance. They were drawn with only about 70% of the ink of the inheritance triangle next to them, so the filled/hollow distinction was easy to miss at normal zoom. The diamond now carries at least the triangle's visual weight — matching how draw.io and Mermaid proportion the two — while staying no taller, so it never overhangs a class box further than the triangle already did.

- [#789](https://github.com/ls1intum/Apollon/pull/789) [`43d2739`](https://github.com/ls1intum/Apollon/commit/43d2739873d1ed9e65a72ef14caf5e3f2a0e1833) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Dragging the first element from the palette onto an empty canvas no longer jumps the view — the element now lands where you drop it.

- [#801](https://github.com/ls1intum/Apollon/pull/801) [`0ac2478`](https://github.com/ls1intum/Apollon/commit/0ac2478749e3deef74f3ddadbae6dc87191c56a2) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Clicking empty canvas near an edge no longer selects that edge: the edge's edit/delete toolbar was anchored to an invisible box offset from the line that captured clicks. An edge is now selected only by clicking its actual line.

- [#801](https://github.com/ls1intum/Apollon/pull/801) [`0ac2478`](https://github.com/ls1intum/Apollon/commit/0ac2478749e3deef74f3ddadbae6dc87191c56a2) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Selecting a node no longer blocks clicks on a node overlapping it: the selected node's connection points and resize handles stick out past its edges, and they used to swallow clicks meant for the node beneath. They now only capture while you hover the node (which is how you reach for them anyway), so an overlapping node stays selectable everywhere it's visible.

- [#791](https://github.com/ls1intum/Apollon/pull/791) [`474029e`](https://github.com/ls1intum/Apollon/commit/474029ea8c2fbc39b73fd86b2f6e91e5bef9ceee) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - The edit/delete toolbar on a selected node no longer blocks clicks on a node behind it — its empty area now lets clicks through, and only the icons themselves stay clickable.

- [#781](https://github.com/ls1intum/Apollon/pull/781) [`882b88c`](https://github.com/ls1intum/Apollon/commit/882b88cf517f2caaeb2e189d7df7a7b3282a1bf6) Thanks [@tamang29](https://github.com/tamang29)! - See more of the canvas on mobile with a compact element palette in both portrait and landscape.

## 5.0.1

### Patch Changes

- [#787](https://github.com/ls1intum/Apollon/pull/787) [`82ef0af`](https://github.com/ls1intum/Apollon/commit/82ef0af97792d17495f318ebdfee908ba0cdbf13) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Fixes the editor's floating chrome — palette, node toolbars, and zoom/undo controls — losing its frosted-glass blur in Chrome and Firefox, where it rendered as a flat translucent panel.

## 5.0.0

### Major Changes

- [#785](https://github.com/ls1intum/Apollon/pull/785) [`91d36ad`](https://github.com/ls1intum/Apollon/commit/91d36addd69f1982c79df1dfc68c8a5da17e7f8a) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Everything ships from one entry now: `@tumaet/apollon` exports the `<Apollon>` React component, the hooks, the provider, and the imperative `ApollonEditor` API together, with every dependency external. `react`, `react-dom`, and `@xyflow/react` are required peers alongside `yjs` / `y-protocols`, so your app and the editor share a single copy of each — no duplicate React, and your bundle analyzer / SBOM sees the real packages instead of a copy inlined into one chunk.

  If you imported from the `/react` or `/external` subpaths, switch to `@tumaet/apollon`:

  - `@tumaet/apollon/external` → `@tumaet/apollon` — same `ApollonEditor` API, just drop the subpath.
  - `@tumaet/apollon/react` → `@tumaet/apollon` — the component, hooks, and provider are on the main entry.
  - Install the peers if you haven't: `react react-dom @xyflow/react` (npm 7+ auto-installs them; pnpm/yarn users add them explicitly).
  - The main entry is a client module (`"use client"`) — import it from client components, not React Server Components.
  - `@tumaet/apollon/internals` and `@tumaet/apollon/export` are unchanged.

  See the [Upgrading guide](https://ls1intum.github.io/Apollon/library/upgrading) for the full walkthrough.

### Minor Changes

- [#759](https://github.com/ls1intum/Apollon/pull/759) [`e4a44f2`](https://github.com/ls1intum/Apollon/commit/e4a44f200c864e8684d01bf4113968c7dfc7fa96) Thanks [@FadyGergesRezk](https://github.com/FadyGergesRezk)! - Adds a public theming API for embedding hosts. You can now theme the editor with a typed helper instead of hand-writing CSS variables: `createApollonTheme()` maps a structured `ApollonTheme` (primary, background, grid, etc.) to the underlying `--apollon-*` custom properties, and `<Apollon>` accepts optional `theme` and `dataTheme` props (also available as `ApollonOptions` fields) that are applied to the editor mount node.

  ```ts
  import { Apollon, createApollonTheme } from "@tumaet/apollon"

  <Apollon theme={createApollonTheme({ primary: "#6d28d9", background: "#0b0b0c" })} dataTheme="dark" />
  ```

  The CSS custom-property contract remains the framework-agnostic source of truth (documented in `THEMING.md`); the helper is an ergonomic, type-safe wrapper over it. Un-themed embeds are unaffected.

- [#759](https://github.com/ls1intum/Apollon/pull/759) [`e4a44f2`](https://github.com/ls1intum/Apollon/commit/e4a44f200c864e8684d01bf4113968c7dfc7fa96) Thanks [@FadyGergesRezk](https://github.com/FadyGergesRezk)! - Removes MUI and Emotion from the editor. Its controls, popovers, toolbars, and minimap are rebuilt on lightweight Base UI primitives and styled entirely through the public `--apollon-*` CSS variables, so embedding hosts get a smaller dependency footprint, no Emotion runtime, and no MUI global-style collisions — with the editor's look and behaviour unchanged.

### Patch Changes

- [#786](https://github.com/ls1intum/Apollon/pull/786) [`16e90a7`](https://github.com/ls1intum/Apollon/commit/16e90a739b5e50938fd9276660494b317473d6ca) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Modernize the build toolchain and cut a runtime dependency, behavior-identical. `uuid` is gone — the editor now mints RFC-4122 v4 IDs from an embed-safe `crypto.getRandomValues` (works in any context, unlike `crypto.randomUUID`). The build moves to Vite 8 (Rolldown/Oxc), TypeScript 6.0, and vite-plugin-dts 5 (+ `@microsoft/api-extractor`), and every remaining runtime dependency (`@base-ui/react`, `lucide-react`, `@chenglou/pretext`, …) is verified at its latest release. No public API or rendering change.

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
