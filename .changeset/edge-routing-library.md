---
"@tumaet/apollon": minor
---

Reworked edge routing and interaction: step-edge bends are predictable and grid-snapped, manually placed waypoints survive endpoint reconnection, endpoint reconnection follows React Flow's native behaviour, and only an edge's inputs (endpoints, waypoints, handles) are synced through Yjs — never computed geometry — so collaborators no longer thrash shared state.
