---
"@tumaet/apollon": minor
---

Everything ships from one entry now: `@tumaet/apollon` exports the `<Apollon>` React component, the hooks, the provider, and the imperative `ApollonEditor` API together, with every dependency external. `react`, `react-dom`, and `@xyflow/react` are required peers alongside `yjs` / `y-protocols`, so your app and the editor share a single copy of each — no duplicate React, and your bundle analyzer / SBOM sees the real packages instead of a copy inlined into one chunk.

If you imported from the `/react` or `/external` subpaths, switch to `@tumaet/apollon`:

- `@tumaet/apollon/external` → `@tumaet/apollon` — same `ApollonEditor` API, just drop the subpath.
- `@tumaet/apollon/react` → `@tumaet/apollon` — the component, hooks, and provider are on the main entry.
- Install the peers if you haven't: `react react-dom @xyflow/react` (npm 7+ auto-installs them; pnpm/yarn users add them explicitly).
- The main entry is a client module (`"use client"`) — import it from client components, not React Server Components.
- `@tumaet/apollon/internals` and `@tumaet/apollon/export` are unchanged.
