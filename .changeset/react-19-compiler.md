---
"@tumaet/apollon": minor
"@tumaet/webapp": minor
---

Upgrade to React 19 and enable the React Compiler.

`@tumaet/apollon` now targets React 19 — its `react` and `react-dom` peer dependencies are `^19.0.0`. The `<Apollon>` component takes `ref` as a regular prop (the `forwardRef` wrapper was removed); consumers passing a `ref` need no changes. The React Compiler auto-memoizes the editor, so the manual `useMemo`/`useCallback`/`memo` and the hand-rolled stale-closure workarounds have been removed, and node/edge popovers anchor via a callback ref instead of reading a ref during render.
