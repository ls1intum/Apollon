---
"@tumaet/apollon": minor
---

feat: undo/redo in shared (collaborative) diagrams

The undo manager was previously single-user only, so collaboration sessions had
no undo/redo. It is now active in collaboration too, scoped to each user's own
edits (local undo): pressing undo reverts only your changes, never a peer's, and
never clobbers a concurrent remote edit to the same element. A whole drag or
resize is a single undo step, and the selection is restored when an edit is
undone or redone.

To keep this freeze-safe, transient drag/resize frames are no longer written to
the document in either mode (an always-on undo manager would otherwise pin every
per-frame struct and grow the document unbounded). Live remote dragging is
preserved by broadcasting the in-progress position/size over the ephemeral
awareness channel instead — peers still see the gesture move in real time, with
no document growth and nothing entering undo history.
