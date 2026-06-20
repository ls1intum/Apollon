# @tumaet/webapp

## 4.8.0

### Minor Changes

- [#678](https://github.com/ls1intum/Apollon/pull/678) [`17a01b2`](https://github.com/ls1intum/Apollon/commit/17a01b25b648f982a259fe25f15d6efae512710c) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Diagrams you keep on your device — the ones you haven't shared through the server — now have version history. Save named versions as you work, scroll back through them, preview any earlier version (or open it in a new tab to compare side by side), and restore one. Every restore first snapshots whatever is on the canvas, so you can always undo it. Your versions stay on your device, work fully offline, and stay in sync across browser tabs. Shared diagrams also gain a "Save a local copy" action, so you can keep an editable copy on your device before the shared version expires.

- [#769](https://github.com/ls1intum/Apollon/pull/769) [`d56ebf0`](https://github.com/ls1intum/Apollon/commit/d56ebf01c6424255960e466b7c8ae0f8dca0128d) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - The diagram dashboard has a cleaner, more modern look — a slimmer top bar, lighter shadows, cooler surfaces, and rounded cards — with stronger text and border contrast for better readability and accessibility in both light and dark themes. The top bar is now the same height with consistent buttons on the dashboard and inside the editor, the editor toolbar collapses long labels (like "All diagrams" and "Version history") to icons when space is tight, and dark mode uses one consistent cool palette throughout.

### Patch Changes

- [#761](https://github.com/ls1intum/Apollon/pull/761) [`5d4a8dd`](https://github.com/ls1intum/Apollon/commit/5d4a8dd5d6d34d1c26d4258a99aadc02faca1c17) Thanks [@tamang29](https://github.com/tamang29)! - Mobile navigation, editor controls, sharing, and the New Diagram dialog now fit iPhone portrait and landscape screens without overlapping notches or menus.

- [#763](https://github.com/ls1intum/Apollon/pull/763) [`82942cd`](https://github.com/ls1intum/Apollon/commit/82942cddec7d3dd33711d3f38eba92e10c1da0c9) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Fixes the standalone editor sometimes losing your most recent change when you navigate away or when a save didn't reach the server. Your latest edit is now saved reliably on the way out, a save is never reported as successful unless it actually persisted, and an edit made while you are previewing an earlier version is saved once you return.

- [#675](https://github.com/ls1intum/Apollon/pull/675) [`1bb280d`](https://github.com/ls1intum/Apollon/commit/1bb280d23f9a4cfb9339a04b2311c1c50aeffae7) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Fixes PNG and PDF export on large or complex diagrams. Exporting one used to do nothing — the menu closed and either no file or a 0-byte image was saved. Now the PNG downloads reliably, the PDF stays sharp at any zoom, and if a diagram is too large to export the app tells you instead of failing silently.

- Updated dependencies [[`82942cd`](https://github.com/ls1intum/Apollon/commit/82942cddec7d3dd33711d3f38eba92e10c1da0c9), [`5013fc6`](https://github.com/ls1intum/Apollon/commit/5013fc632ea0e18c9fce5baf1f66f1d50617a358), [`5d4a8dd`](https://github.com/ls1intum/Apollon/commit/5d4a8dd5d6d34d1c26d4258a99aadc02faca1c17), [`1bb280d`](https://github.com/ls1intum/Apollon/commit/1bb280d23f9a4cfb9339a04b2311c1c50aeffae7)]:
  - @tumaet/apollon@4.8.0

## 4.7.0

### Minor Changes

- [#764](https://github.com/ls1intum/Apollon/pull/764) [`1fc31cc`](https://github.com/ls1intum/Apollon/commit/1fc31cc7c1d2c8dedb3555edb5d5d063f572acae) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Upgrade to React 19 and enable the React Compiler.

  `@tumaet/apollon` now targets React 19 — its `react` and `react-dom` peer dependencies are `^19.0.0`. The `<Apollon>` component takes `ref` as a regular prop (the `forwardRef` wrapper was removed); consumers passing a `ref` need no changes. The React Compiler auto-memoizes the editor, so the manual `useMemo`/`useCallback`/`memo` and the hand-rolled stale-closure workarounds have been removed, and node/edge popovers anchor via a callback ref instead of reading a ref during render.

### Patch Changes

- [#758](https://github.com/ls1intum/Apollon/pull/758) [`af7c085`](https://github.com/ls1intum/Apollon/commit/af7c085e1db2073e82641af17f363907067389da) Thanks [@tamang29](https://github.com/tamang29)! - The iOS app supports both iPhone and iPad again so updates remain compatible with existing installations.

- [#765](https://github.com/ls1intum/Apollon/pull/765) [`6fe657c`](https://github.com/ls1intum/Apollon/commit/6fe657cfabbb1f60936d03b758039fe1e7fade6f) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Simplify PPTX text positioning. `@tumaet/apollon`'s `compat` export now resolves `dominant-baseline` into an explicit baseline `y`, so the PPTX exporter no longer needs its empirically-tuned `TEXT_BASELINE_OFFSET_PX` fudge — the text-box top is derived directly from the resolved baseline and the box height.

- Updated dependencies [[`6fe657c`](https://github.com/ls1intum/Apollon/commit/6fe657cfabbb1f60936d03b758039fe1e7fade6f), [`6fe657c`](https://github.com/ls1intum/Apollon/commit/6fe657cfabbb1f60936d03b758039fe1e7fade6f), [`21c6f99`](https://github.com/ls1intum/Apollon/commit/21c6f9914b1ab24d79fa6f6d6527ca6260db8c43), [`1fc31cc`](https://github.com/ls1intum/Apollon/commit/1fc31cc7c1d2c8dedb3555edb5d5d063f572acae)]:
  - @tumaet/apollon@4.8.0

## 4.6.0

### Minor Changes

- [#662](https://github.com/ls1intum/Apollon/pull/662) [`6bc0372`](https://github.com/ls1intum/Apollon/commit/6bc037268849b657cb409f9a0bf3b805e52a7883) Thanks [@FadyGergesRezk](https://github.com/FadyGergesRezk)! - Add a home page that opens to a gallery of all your diagrams, each with a live preview, plus search, sorting by last modified, and favorites — with your shared diagrams shown alongside your local ones. You can create a diagram from scratch or from a template (previewing each) without leaving the gallery, and because every diagram now has its own address you can cmd/ctrl-click to open several in new tabs and jump back to the gallery from the editor. The imprint and privacy pages are reachable from anywhere, with a clear way back to whatever you were working on.

### Patch Changes

- [#744](https://github.com/ls1intum/Apollon/pull/744) [`1fdb9bc`](https://github.com/ls1intum/Apollon/commit/1fdb9bc70b2fcfc119619876d595b36eebb36f8a) Thanks [@tamang29](https://github.com/tamang29)! - The playground can now simulate a live collaboration session across two browser tabs, with collapsible side panels that mimic host-app chrome — handy for trying out shared cursors and presence locally.

- Updated dependencies [[`1fdb9bc`](https://github.com/ls1intum/Apollon/commit/1fdb9bc70b2fcfc119619876d595b36eebb36f8a), [`dfb4479`](https://github.com/ls1intum/Apollon/commit/dfb4479bbf15671a6332c96b659efd9dd31c127b)]:
  - @tumaet/apollon@4.8.0

## 4.5.1

### Patch Changes

- [#738](https://github.com/ls1intum/Apollon/pull/738) [`247cf52`](https://github.com/ls1intum/Apollon/commit/247cf52c2f5d4460f406a0aac57c2df40cd2e324) Thanks [@tamang29](https://github.com/tamang29)! - The iOS app is now only available on iPad.

## 4.5.0

### Minor Changes

- [#713](https://github.com/ls1intum/Apollon/pull/713) Thanks [@tamang29](https://github.com/tamang29)! - The mobile app can now export diagrams as PowerPoint (PPTX), matching the web app.

- [#701](https://github.com/ls1intum/Apollon/pull/701) Thanks [@tamang29](https://github.com/tamang29)! - Apollon now runs as a native iOS and Android app, with native copy-to-clipboard and share links that always point at the web app so they open anywhere.

- [#710](https://github.com/ls1intum/Apollon/pull/710) Thanks [@FadyGergesRezk](https://github.com/FadyGergesRezk)! - Editing edges feels better: drag a bend handle to move one segment and watch the path update live, reconnect an endpoint without losing the waypoints you placed, and connection handles no longer crowd or overlap on small shapes.

- [#681](https://github.com/ls1intum/Apollon/pull/681) Thanks [@tamang29](https://github.com/tamang29)! - Follow a collaborator while editing together: click their avatar to snap your view to theirs and keep tracking it as they move around the canvas.

### Patch Changes

- Updated dependencies:
  - @tumaet/apollon@4.8.0

## 4.4.1

### Patch Changes

- [#683](https://github.com/ls1intum/Apollon/pull/683) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Sharing a diagram a second time, or starting a new diagram during a collaboration session, no longer leaves a blank canvas behind.
- [#682](https://github.com/ls1intum/Apollon/pull/682) Thanks [@tamang29](https://github.com/tamang29)! - PNG, SVG, PDF, and JSON export work again on iOS and Android. Closes [#553](https://github.com/ls1intum/Apollon/issues/553).

## 4.4.0

### Major Changes

- [#657](https://github.com/ls1intum/Apollon/pull/657) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Deployment break: requires Redis Stack 7.4 and an `OWNER_SECRET` ≥ 32 chars. Diagram keys move from `STRING` to `RedisJSON`; a one-shot migration must run before deploy. Runbook in the [GitHub Release](https://github.com/ls1intum/Apollon/releases/tag/v4.4.0).

### Minor Changes

- [#658](https://github.com/ls1intum/Apollon/pull/658) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Export diagrams as animatable PowerPoint slides — every class, arrow, label, and attribute becomes its own native PowerPoint shape, ready for per-element animations.
- [#663](https://github.com/ls1intum/Apollon/pull/663) Thanks [@tamang29](https://github.com/tamang29)! - Live cursors and presence during a collaboration session.
- [#657](https://github.com/ls1intum/Apollon/pull/657) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Figma-style version history: named milestones, 30-minute auto-snapshots, preview, one-click restore with undo, permalinks.
