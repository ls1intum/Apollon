---
"@tumaet/apollon": patch
---

Fixed resize handles across every node. Borders that can't resize no longer show a resize cursor — a class's height is driven by its attributes and methods, so its top and bottom borders used to offer a vertical-resize cursor and a drag that did nothing. Content-sized nodes keep their corner handles and resize only along the axis that can change. And on filled nodes such as activity swimlanes, the edge you drag to resize is now grabbable instead of hiding behind the node — previously only the corners worked.
