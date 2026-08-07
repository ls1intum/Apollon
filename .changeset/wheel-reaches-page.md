---
"@tumaet/apollon": patch
---

Scroll lock now hands the wheel back to the page. A locked canvas previously swallowed the wheel entirely — it would not zoom, and the host page would not scroll either — so an editor embedded in a long form became a region readers could not scroll past. Holding the zoom modifier still zooms, and an unlocked canvas is unchanged.
