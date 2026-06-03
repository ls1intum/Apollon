---
"@tumaet/apollon": major
---

Add a first-class React API and split the package into two entry points.

- `@tumaet/apollon/react` exports an `<Apollon>` component plus `ApollonProvider`, `useApollonEditor`, `useApollonEditorOrThrow`, and `useApollonSubscription`. It treats `react`, `react-dom`, `@mui/material`, `@emotion/react`, and `@xyflow/react` as peer dependencies so a React host resolves a single shared copy.
- The default `@tumaet/apollon` entry stays framework-agnostic and bundles those dependencies, so non-React hosts install with zero peers.

**Migrating from 4.x:**

- React hosts: import from `@tumaet/apollon/react` and add the five peers above to your own dependencies.
- Minimum Node is now 22 (was 20).
- Removed the `ApollonOptions` fields `theme`, `copyPasteToClipboard`, `colorEnabled`, and `scale`, and the `theme` argument of `exportModelAsSvg`.
- Low-level sync internals (`YjsSync`, format converters) moved to `@tumaet/apollon/internals` and are not covered by semver.
