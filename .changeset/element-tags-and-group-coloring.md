---
"@tumaet/apollon": minor
---

Adds element tags — short labels you attach to a class, an attribute, or a method, where many elements can share the same one. Tag every member a programming test covers, then ask the editor for that tag with `editor.getElementIdsByTag("testAttributes[Context]")` and hand the result straight to `setElementHighlights`. That is enough to repaint a sample solution green, red, or grey from each build result, so the same diagram can show a different picture to every student without the saved model ever changing.

Tag authoring is off by default and enabled with the new `tags` option: `true` for free-form tags, or an object to offer a fixed vocabulary (`available`) and decide whether users may create their own (`allowCreate`). A host can also set tags without the UI via `editor.setElementTags(id, tags)`. When enabled, each class, attribute, and method shows its tags as removable chips next to a tag button that opens a searchable combobox. Colors are now edited in a popover too, so the edit panel no longer grows inline. Tags are part of the diagram, so they survive export, import, and copy/paste — and a diagram with no tags is untouched.
