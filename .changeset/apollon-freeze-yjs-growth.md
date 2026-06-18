---
"@tumaet/apollon": patch
---

fix: stop unbounded Yjs growth that froze the editor during long sessions

Dragging or resizing a node committed a CRDT struct on every animation frame,
and the always-on undo manager pinned each one, so a long single-user editing
session could grow the document by orders of magnitude until the tab froze
(observed in Firefox). In single-user editing the editor now commits only the
settled position and size of a drag or resize, and diffs map writes instead of
clearing and re-setting every key. Undo/redo is fully preserved — a drag is a
single undo step and the history is never capped. Collaboration is unchanged: it
keeps live per-frame updates (no undo manager is created there, so the transient
frames are GC-reclaimed) to drive the live remote drag.

The alignment-guide overlay no longer unmounts and remounts its SVG on every
drag. Guides clear when a drag ends, so the overlay previously detached its
whole SVG subtree each gesture and rebuilt it on the next one; it now stays
mounted and toggles visibility. This removes per-drag DOM churn that some
browsers (Firefox) retain via native references across a long session.
