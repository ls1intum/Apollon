# Changelog

All notable changes to `@tumaet/apollon` will be documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

GitHub Releases at <https://github.com/ls1intum/Apollon/releases> carry the full per-release notes; this file tracks breaking-change summaries.

## [5.0.0]

### Breaking

- **Dropped the `@tumaet/apollon/react` subpath** and the standalone 2.4 MB bundle that inlined React/MUI/emotion/xyflow. The default `@tumaet/apollon` import now always externalizes those packages as **mandatory peer dependencies**.
- **`peerDependenciesMeta` removed** — peers are no longer optional. Install React, ReactDOM, `@mui/material`, `@emotion/react`, `@emotion/styled`, and `@xyflow/react` explicitly.
- **Internal sync exports moved** to a new `@tumaet/apollon/internals` subpath (`YjsSyncClass`, `MessageType`, `createHeadlessSync`). The new subpath is explicitly **not** covered by SemVer.

### Migration from 4.x

```diff
- import { ApollonEditor } from "@tumaet/apollon/react"
+ import { ApollonEditor } from "@tumaet/apollon"
```

```sh
npm install @tumaet/apollon@5 \
  react react-dom \
  @emotion/react @emotion/styled @mui/material @xyflow/react
```

Standalone (non-React) consumers who previously imported from `@tumaet/apollon` must now install the React peers as well. See `README.md`.

### Other

- Single Vite pass (`tsc -b && vite build`); the prior dual-build + `rm -rf dist/react/assets` hack is gone.
- `dist/index.d.ts` is rolled up into a single self-contained file (no internal relative imports without `.js` suffix). NodeNext consumers resolve cleanly.
- esbuild `drop` narrowed to `["debugger"]` — `console.warn` calls from React/MUI/emotion are no longer stripped at minification.
- README rewritten: ~73 lines, React-only, one factual install command.

[5.0.0]: https://github.com/ls1intum/Apollon/releases
