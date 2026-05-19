# @tumaet/webapp

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
