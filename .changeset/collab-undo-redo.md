---
"@tumaet/apollon": minor
---

Adds undo/redo to shared (collaborative) diagrams. Undo and redo now work during a collaboration session, scoped to each person's own edits — undo reverts only your own changes, never a teammate's, and never overwrites an element someone else is editing. A whole drag or resize counts as a single step, your selection comes back with the change you undo, and everyone keeps seeing each other's edits move in real time.
