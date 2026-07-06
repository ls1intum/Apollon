---
"@tumaet/apollon": patch
---

Edges now attach to each node's real shape, and a node's connectable points match the handles it shows. Round and diamond nodes — activity start/end, BPMN events and gateways, flowchart decisions, petri places, and component/deployment interfaces — connect at their four N/E/S/W points instead of anywhere on the bounding box. Use-case ovals connect anywhere along their curve. Legends, annotations and swimlanes are no longer connection targets. You can again reconnect an edge endpoint onto a container node (activity, package, pool, subsystem). And on direct (straight) edges, the reconnect grip now aligns with the edge's angle instead of always sitting orthogonally.
