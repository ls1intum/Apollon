---
"@tumaet/apollon": patch
"@tumaet/webapp": patch
---

fix: stop unbounded Yjs growth that froze the editor during long exam sessions

Dragging or resizing a node wrote a CRDT struct on every animation frame, and
the always-on undo manager pinned each one, so a single-user exam session could
grow the document by orders of magnitude and eventually freeze the tab
(observed in Firefox). The editor now commits only the final position/size of a
drag or resize, diffs map writes instead of clearing and re-setting every key,
bounds the undo stack, and keeps live-drag presence in ephemeral awareness so it
never reaches the persisted document. Collaborative live-drag ghosts are
preserved. The standalone webapp's autosave is change-debounced with a flush on
teardown so the trailing edit is persisted on tab close or navigation.
