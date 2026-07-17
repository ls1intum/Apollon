---
"@tumaet/apollon": patch
---

Nodes no longer offer a resize cursor on borders that can't resize. A class's height is driven by its attributes and methods, so its top and bottom borders showed a resize cursor and accepted a drag that did nothing. Content-sized nodes — classes, object and communication-object nodes, SFC action tables and the activity fork bars — now show resize controls only on the borders that can move: drag those side borders, which are easier to grab than before, rather than a corner.
