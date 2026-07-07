---
"@tumaet/apollon": patch
---

Drawing a connection now shows a clear dashed preview that appears once you drag away from a node and lands exactly where the edge will attach. Dragging an edge's endpoint across empty canvas follows your cursor instead of snapping back, and the endpoint grip stays on the edge tip instead of drifting away when you zoom out.

Connection points are also easier to grab — a connection arc responds as soon as you reach it, without having to hover the node body first. A connection attaches to the nearest node when several sit close together, and a new connection snaps to the grid the same way dragging an existing endpoint does.
