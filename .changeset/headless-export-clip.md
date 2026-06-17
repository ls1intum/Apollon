---
"@tumaet/apollon": patch
---

Fix the headless SVG/PNG/PDF export cropping the right and bottom of diagrams.

Under jsdom the off-screen editor reports a zero-size bounding rect, and the bounds math kept that zero (`0 ?? fallback` evaluates to `0`) instead of falling back to each node's real width and height. The export viewBox then enclosed only node positions, slicing off the rightmost and bottommost elements. A non-positive rect is now treated as unmeasured, so the clip encloses the whole diagram.
