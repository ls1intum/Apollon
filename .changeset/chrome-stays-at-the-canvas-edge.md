---
"@tumaet/apollon": patch
---

Keep the zoom, undo and minimap controls pinned to the bottom of the canvas in embedded editors. An editor mounted below the fold mistook the gap between its bottom edge and the window for an on-screen keyboard and reserved that whole gap as padding, stranding the controls mid-diagram — and scrolling the editor into view never cleared it. The editor now reserves only the part of the canvas a keyboard actually covers.
