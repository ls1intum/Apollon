---
"@tumaet/apollon": patch
---

Edges now attach to each node's real shape instead of its bounding box. Connections to use-case ovals and round nodes (events, start/end markers, places) meet the curve at the point you aimed for; connections to diamonds (gateways, decisions) snap to the nearest vertex; interface lollipops connect at their centre; and legends, annotations and swimlanes are no longer connection targets.
