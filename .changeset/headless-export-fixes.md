---
"@tumaet/apollon": patch
---

Fix two headless / `compat` export bugs that corrupted diagrams rendered outside a browser (the standalone server, resvg, Inkscape, PowerPoint):

- **Cropped diagrams.** Under jsdom the off-screen editor reports a zero-size bounding rect, which the bounds math kept (`0 ?? fallback` evaluates to `0`) instead of falling back to each node's real width and height — so the export viewBox enclosed only node _positions_ and sliced off the rightmost and bottommost elements. A non-positive rect is now treated as unmeasured.
- **Mangled class stereotypes.** Stereotype labels (`«interface»`, `«enumeration»`) used a relative `font-size` (`85%`) and cumulative `<tspan dy>` offsets — which browsers resolve but other renderers don't, so the guillemets ballooned over and overlapped the class name. `compat` exports now resolve relative font sizes to absolute px and tspan offsets to absolute `y`.
