---
"@tumaet/apollon": patch
---

Fixes the editor gradually slowing down and freezing during long single-user editing sessions. Repeatedly dragging or resizing nodes no longer makes the diagram progressively heavier until the tab locks up — the editor stays responsive, and undo/redo and live collaboration behave exactly as before. Lining up nodes with the alignment guides is also lighter on every drag, which most affected long sessions in Firefox.
