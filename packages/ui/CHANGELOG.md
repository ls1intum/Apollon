# @tumaet/ui

## 0.0.2

### Patch Changes

- [#806](https://github.com/ls1intum/Apollon/pull/806) [`ecad49e`](https://github.com/ls1intum/Apollon/commit/ecad49ea7c88e0e4c90994bab37d9d80efef2712) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Fix form controls and portaled popups ignoring a scoped theme.

  Three separate causes, all of which only showed up when `data-theme` sits on the editor's own mount node rather than the document root:

  - The `--home-*` aliases the shared input/select/button primitives paint from were declared only on `:root`, so they resolved against the document's light base and merely inherited the computed value. A dark embed drew light input borders and light placeholder ink. They are now re-declared on `.apollon-editor`, like the chrome ramp.
  - Text fields inherited nothing and fell through to the UA's `color: fieldtext`, a system color keyed to `color-scheme` — i.e. the OS appearance, not the editor's theme. A light editor on a dark desktop rendered white text in its inputs. `[data-slot="input"]` and `[data-slot="textarea"]` now reset `color` to `inherit`.
  - Body-portaled popups copy resolved token values, but never recomputed them, so a theme switch left an open menu — and every later one anchored to the same element — painting the old palette. They now subscribe to theme changes.

## 0.0.1

### Patch Changes

- [#786](https://github.com/ls1intum/Apollon/pull/786) [`16e90a7`](https://github.com/ls1intum/Apollon/commit/16e90a739b5e50938fd9276660494b317473d6ca) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Drop the unused `cmdk` command-palette component (zero importers) and its dependency, plus a dead `@vitest/coverage-v8` dev dependency. Migrate React linting to `@eslint-react` for ESLint 10 and bump the toolchain (Tailwind 4.3). No component API change.
