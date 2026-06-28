---
"@tumaet/apollon": major
---

Collapse the three build variants (`@tumaet/apollon`, `/react`, `/external`) into a single fully-external entry. Every runtime dependency is now externalized — resolved from the host's `node_modules` — so the bundler de-duplicates it and SBOM tooling attributes it correctly, instead of a copy inlined into the bundle. `react`, `react-dom`, and `@xyflow/react` become **required** peers (joining `yjs`/`y-protocols`); they were previously marked optional. The `<Apollon>` component, hooks, and provider now ship from the main entry.

### Migration

- `@tumaet/apollon/external` → `@tumaet/apollon` (same `ApollonEditor` API; drop the subpath).
- `@tumaet/apollon/react` → `@tumaet/apollon` (component, hooks, provider on the main entry).
- Consumers must now provide `react`, `react-dom`, `@xyflow/react` (peers; most package managers auto-install missing peers).
- The main entry is now a client module (`"use client"`); React Server Components must treat `@tumaet/apollon` as client-only.
- `/internals` and `/export` are unchanged.
