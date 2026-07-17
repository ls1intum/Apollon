---
"@tumaet/apollon": minor
---

Adds element tags — short labels you attach to a class, an attribute, or a method, where many elements can share the same one. Tag every member a programming test covers, then ask the editor for that tag with `editor.getElementIdsByTag("testAttributes[Context]")` and hand the result straight to `setElementHighlights`. That is enough to repaint a sample solution green, red, or grey from each build result, so the same diagram can show a different picture to every student without the saved model ever changing.

Tags are authored in the class popover: the class itself has a Tags field, and each attribute and method row has its own tag toggle. You can paste a comma-separated list to add several at once; entries are trimmed and de-duplicated as you type. Tags are part of the diagram, so they survive export, import, and copy/paste — and a diagram with no tags is untouched.
