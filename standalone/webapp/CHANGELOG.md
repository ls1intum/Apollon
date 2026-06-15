# @tumaet/webapp

## 4.6.0

### Minor Changes

- [#662](https://github.com/ls1intum/Apollon/pull/662) [`6bc0372`](https://github.com/ls1intum/Apollon/commit/6bc037268849b657cb409f9a0bf3b805e52a7883) Thanks [@FadyGergesRezk](https://github.com/FadyGergesRezk)! - Add a home page that opens to a gallery of all your diagrams, each with a live preview, plus search, sorting by last modified, and favorites — with your shared diagrams shown alongside your local ones. You can create a diagram from scratch or from a template (previewing each) without leaving the gallery, and because every diagram now has its own address you can cmd/ctrl-click to open several in new tabs and jump back to the gallery from the editor. The imprint and privacy pages are reachable from anywhere, with a clear way back to whatever you were working on.

### Patch Changes

- [#744](https://github.com/ls1intum/Apollon/pull/744) [`1fdb9bc`](https://github.com/ls1intum/Apollon/commit/1fdb9bc70b2fcfc119619876d595b36eebb36f8a) Thanks [@tamang29](https://github.com/tamang29)! - The playground can now simulate a live collaboration session across two browser tabs, with collapsible side panels that mimic host-app chrome — handy for trying out shared cursors and presence locally.

- Updated dependencies [[`1fdb9bc`](https://github.com/ls1intum/Apollon/commit/1fdb9bc70b2fcfc119619876d595b36eebb36f8a), [`dfb4479`](https://github.com/ls1intum/Apollon/commit/dfb4479bbf15671a6332c96b659efd9dd31c127b)]:
  - @tumaet/apollon@4.6.0

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
  - @tumaet/apollon@4.6.0

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
