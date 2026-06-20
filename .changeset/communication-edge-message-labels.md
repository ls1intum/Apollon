---
"@tumaet/apollon": patch
---

Fixes communication-diagram message labels overlapping the edge line and appearing on the wrong sides of a vertical edge. Labels are now anchored to the edge with a constant gap and grown outward via the SVG text-anchor, so the clearance no longer depends on an estimate of the text width. Forward messages sit above (horizontal edge) or to the right (vertical edge) and backward messages below/left, with flow direction encoded solely by the arrow rotation.
