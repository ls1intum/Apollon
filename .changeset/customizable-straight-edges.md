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
They also bend around any node that sits directly in their path — leaving each element
squarely rather than sliding out along its side, taking one clear corner instead of a
staircase of kinks, and keeping their distance from other connections instead of crossing
or crowding them. A clear straight shot still stays straight, and your hand-placed
waypoints are always respected. Syntax trees additionally gain a one-click "Tidy tree
layout" that arranges the nodes hierarchically so the links no longer overlap siblings.
