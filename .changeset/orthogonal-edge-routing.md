---
"@tumaet/apollon": minor
---

Edges now route themselves far more cleanly. They avoid unnecessary corners and crossings, run straight when two boxes line up, leave a node from a suitable side, and space themselves evenly where several meet one side — instead of piling into a corner, stepping when they could be straight, or looping around another edge. Dragging an endpoint preserves its attachment while the route remains eligible for layout; dragging a bend preserves the route you authored. In both cases, neighbouring edges adapt without jumping on release. Automatic results are deterministic, so every collaborator and a reloaded page see the same picture.
