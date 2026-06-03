# @tumaet/webapp

## 4.5.0

### Minor Changes

- [#713](https://github.com/ls1intum/Apollon/pull/713) Thanks [@tamang29](https://github.com/tamang29)! - The mobile app can now export diagrams as PowerPoint (PPTX), matching the web app.

- [#701](https://github.com/ls1intum/Apollon/pull/701) Thanks [@tamang29](https://github.com/tamang29)! - Apollon now runs as a native iOS and Android app, with native copy-to-clipboard and share links that always point at the web app so they open anywhere.

- [#710](https://github.com/ls1intum/Apollon/pull/710) Thanks [@FadyGergesRezk](https://github.com/FadyGergesRezk)! - Editing edges feels better: drag a bend handle to move one segment and watch the path update live, reconnect an endpoint without losing the waypoints you placed, and connection handles no longer crowd or overlap on small shapes.

- [#681](https://github.com/ls1intum/Apollon/pull/681) Thanks [@tamang29](https://github.com/tamang29)! - Follow a collaborator while editing together: click their avatar to snap your view to theirs and keep tracking it as they move around the canvas.

### Patch Changes

- Updated dependencies [[`6c5dc2a`](https://github.com/ls1intum/Apollon/commit/6c5dc2acf927a8cddccbc1eed943fdb77dcf9b06), [`6c5dc2a`](https://github.com/ls1intum/Apollon/commit/6c5dc2acf927a8cddccbc1eed943fdb77dcf9b06), [`6c5dc2a`](https://github.com/ls1intum/Apollon/commit/6c5dc2acf927a8cddccbc1eed943fdb77dcf9b06), [`6c5dc2a`](https://github.com/ls1intum/Apollon/commit/6c5dc2acf927a8cddccbc1eed943fdb77dcf9b06), [`6c5dc2a`](https://github.com/ls1intum/Apollon/commit/6c5dc2acf927a8cddccbc1eed943fdb77dcf9b06), [`6c5dc2a`](https://github.com/ls1intum/Apollon/commit/6c5dc2acf927a8cddccbc1eed943fdb77dcf9b06), [`6c5dc2a`](https://github.com/ls1intum/Apollon/commit/6c5dc2acf927a8cddccbc1eed943fdb77dcf9b06)]:
  - @tumaet/apollon@4.5.0

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
