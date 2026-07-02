---
"@tumaet/apollon": minor
---

Add a `footer` overlay region — a full-width band pinned to the canvas bottom, symmetric to `header`. Registered chrome there reserves bottom room (so the diagram, palette rails, and zoom cluster stay clear above it) and honours the device safe-area/gesture-bar inset. This is the natural home for host action bars — an assessment's Save / Override / Assess-next cluster, an exam's submit bar — as collision-free canvas chrome instead of a stack of bars fighting the editor for space.
