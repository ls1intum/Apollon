---
"@tumaet/apollon": minor
---

feat: add `ApollonEditor.setElementHighlights()` for host-driven element highlighting

Restores the per-element highlight capability that v3 exposed via the
`UMLModelElement.highlight` field and `ApollonEditor.select()`, both of which
were dropped in the v4 rewrite. Hosting apps (e.g. Artemis marking elements
that are missing assessment feedback, or Athena marking elements that have
automatic-feedback suggestions) can now call:

```ts
editor.setElementHighlights(new Map([["element-id", "rgba(23,162,184,0.3)"]]))
editor.setElementHighlights(null) // clear
```

The highlight is a translucent overlay painted over each given node, edge, or
class member id. It is an ephemeral view concern: it is not written into the
model, not serialized by `get model`, and not shared with collaborators. A
companion `getElementHighlights()` returns the current highlight record.
