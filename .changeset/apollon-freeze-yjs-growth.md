---
"@tumaet/apollon": patch
---

fix: stop unbounded Yjs growth that froze the editor during long sessions

Dragging or resizing a node committed a CRDT struct on every animation frame,
and the always-on undo manager pinned each one, so a long editing session could
grow the document by orders of magnitude until the tab froze (observed in
Firefox). The editor now commits only the settled position and size of a drag
or resize, diffs map writes instead of clearing and re-setting every key, and
bounds the undo stack. In-progress drag presence is broadcast over ephemeral
awareness so it never reaches the persisted document, keeping collaborative
live-drag intact.
