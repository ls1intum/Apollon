---
"@tumaet/apollon": patch
---

fix: stop unbounded Yjs growth that froze the editor during long sessions

Dragging or resizing a node committed a CRDT struct on every animation frame,
and the always-on undo manager pinned each one, so a long single-user editing
session could grow the document by orders of magnitude until the tab froze
(observed in Firefox). In single-user editing the editor now commits only the
settled position and size of a drag or resize, diffs map writes instead of
clearing and re-setting every key, and bounds the undo stack. Collaboration is
unchanged: it keeps live per-frame updates (no undo manager is created there, so
the transient frames are GC-reclaimed) to drive the live remote drag.
