---
"@tumaet/apollon": minor
---

Edges now route themselves far more cleanly. They take the fewest corners the layout allows, run straight when two boxes line up, leave a node from the side that faces their partner, and space themselves evenly where several meet one side — instead of piling into a corner, stepping when they could be straight, or looping around a crossing. Dragging an endpoint pins it, and a pinned edge stays exactly where you put it while the rest re-route around it. The result is a pure function of the diagram, so every collaborator and a reloaded page see the same picture.
