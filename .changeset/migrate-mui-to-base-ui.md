---
"@tumaet/apollon": minor
---

Removes MUI and Emotion from the editor. Its controls, popovers, toolbars, and minimap are rebuilt on lightweight Base UI primitives and styled entirely through the public `--apollon-*` CSS variables, so embedding hosts get a smaller dependency footprint, no Emotion runtime, and no MUI global-style collisions — with the editor's look and behaviour unchanged.
