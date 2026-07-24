---
"@tumaet/apollon": minor
---

Shape and tidy diagonal-line diagrams the same way you already can with orthogonal
edges. Use-case, syntax-tree and petri-net connections now have draggable waypoints —
grab a segment's midpoint to add a bend, drag a bend to move it, and double-click or
drag it back onto the line to remove it — so you can route a link cleanly around a
node by hand. These connections now also attach at the side of each element that faces its
partner and spread evenly across a shared side when several connect to the same element —
so they read cleanly instead of stacking on one point or leaving from an arbitrary corner.
They bend automatically around any node that sits directly in their path, while a clear
straight shot stays straight, and your hand-placed waypoints are always respected. Syntax
trees gain a one-click "Tidy tree layout" that arranges nodes hierarchically so
parent-to-child links no longer overlap sibling nodes.
