---
"@tumaet/apollon": major
---

Collapse the three build variants into a single, fully-external entry with required peer dependencies.

Previously the package shipped the same editor three ways: the default `@tumaet/apollon` (React and everything else inlined), `@tumaet/apollon/react` (React family external, ships the `<Apollon>` component), and `@tumaet/apollon/external` (every dependency external). They were the same API compiled three times, and because the inlined default had to coexist with the external ones, `react`/`react-dom`/`@xyflow/react` were marked **optional** peers — which misrepresented the contract (they are mandatory for any real use) and removed install-time enforcement.

Now there is **one** build. `@tumaet/apollon` externalizes every runtime dependency a host can install — the React family, `yjs`/`y-protocols`, and Apollon's own UI deps (`@base-ui/react`, `lucide-react`, `@dnd-kit`, `zustand`, `uuid`, `@chenglou/pretext`) — so the host's bundler resolves and de-duplicates each one and your bundle analyzer / SBOM tooling sees them as the real packages they are, instead of a copy inlined invisibly into one chunk. `react`, `react-dom`, and `@xyflow/react` are now **required** peer dependencies (joining `yjs`/`y-protocols`), honestly enforced at install. The React `<Apollon>` component, hooks, and provider ship from the main entry — there is no longer a separate React copy to worry about, so non-React hosts simply tree-shake them out (the package is side-effect-free except for CSS).

### Migration

- **`@tumaet/apollon/external` → `@tumaet/apollon`.** Same imperative `ApollonEditor` API; just drop the `/external` subpath. (This is the recommended path for bundler hosts of any framework, e.g. Artemis.)
- **`@tumaet/apollon/react` → `@tumaet/apollon`.** The component, hooks, and provider are exported from the main entry now.
- **Default (inlined) consumers** must now provide `react`, `react-dom`, and `@xyflow/react` (most package managers install missing peers automatically). No-bundler / CDN users on esm.sh get them resolved automatically from the import URL.
- The unstable `@tumaet/apollon/internals` and `@tumaet/apollon/export` subpaths are unchanged.
