---
"@tumaet/apollon": patch
---

Nodes no longer show a resize cursor on borders that can't resize. A class's height is driven by its attributes and methods, so its top and bottom borders showed a vertical-resize cursor and accepted a drag that did nothing. Content-sized nodes — classes, object and communication-object nodes, SFC action tables and the activity fork bars — now resize only along the axis that can change: the corner handles stay, but they and the cursor only ever point that way.
