---
"@tumaet/apollon": patch
"@tumaet/ui": patch
---

Fix form controls and portaled popups ignoring a scoped theme.

Three separate causes, all of which only showed up when `data-theme` sits on the editor's own mount node rather than the document root:

- The `--home-*` aliases the shared input/select/button primitives paint from were declared only on `:root`, so they resolved against the document's light base and merely inherited the computed value. A dark embed drew light input borders and light placeholder ink. They are now re-declared on `.apollon-editor`, like the chrome ramp.
- Text fields inherited nothing and fell through to the UA's `color: fieldtext`, a system color keyed to `color-scheme` — i.e. the OS appearance, not the editor's theme. A light editor on a dark desktop rendered white text in its inputs. `[data-slot="input"]` and `[data-slot="textarea"]` now reset `color` to `inherit`.
- Body-portaled popups copy resolved token values, but never recomputed them, so a theme switch left an open menu — and every later one anchored to the same element — painting the old palette. They now subscribe to theme changes.
