# @tumaet/apollon

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
