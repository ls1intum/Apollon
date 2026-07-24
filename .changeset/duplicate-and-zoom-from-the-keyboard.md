---
"@tumaet/apollon": minor
---

Duplicates the selection with Ctrl/Cmd+D — edges between the duplicated elements included — and puts the viewport on the keyboard: Ctrl/Cmd+= and Ctrl/Cmd+- to zoom, Ctrl/Cmd+0 for 100%, Ctrl/Cmd+Shift+1 and Ctrl/Cmd+Shift+2 to fit the diagram or the selection. Esc still clears the selection, which Ctrl/Cmd+D used to do. Zooming, copying and selecting now work on a read-only diagram, shortcuts stay out of open dialogs and half-typed IME characters, and holding a key repeats only undo, redo and zoom.

For embedders: `APOLLON_SHORTCUTS` lists every key the editor consumes, alongside `matchesShortcutCombo`, `isTypingTarget`, `isInsideOverlay` and `shortcutKeyName` — enough to render a shortcut sheet that tracks the editor, or to bind your own keys under the same rules. Pass `keyboardShortcuts: false` to keep the editor off the keyboard entirely.
