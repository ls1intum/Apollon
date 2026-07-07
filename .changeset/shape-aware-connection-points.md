---
"@tumaet/apollon": patch
---

Edges now attach to each node's real shape, and a node's connectable points match the handles it shows. Round and diamond nodes — activity start/end, BPMN events and gateways, flowchart decisions, petri places, and component/deployment interfaces — connect at their four N/E/S/W points. Use-case ovals connect anywhere along their curve, and the flowchart input/output parallelogram connects anywhere along its slanted outline (no more gap on the left/right sides). Legends, annotations and swimlanes are no longer connection targets. You can again reconnect an edge endpoint onto a container node (activity, package, pool, subsystem). On direct (straight) edges, the reconnect grip now sits on the edge and follows its angle. The input/output node's default label is now "Input / Output" so it wraps cleanly.
