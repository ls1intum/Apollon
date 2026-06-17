---
"@tumaet/apollon": patch
---

Make the `compat` export render identically outside a browser (the standalone server, resvg, Inkscape, PowerPoint, macOS Preview), where it was previously corrupted in three ways. The fix is to fully resolve the SVG in one place — the library's `compat` export — instead of leaving browser-only features for downstream consumers to patch around:

- **Cropped diagrams.** Under jsdom the off-screen editor reports a zero-size bounding rect, which the bounds math kept (`0 ?? fallback` evaluates to `0`) instead of falling back to each node's real width and height — so the export viewBox enclosed only node _positions_ and sliced off the rightmost and bottommost elements. A non-positive rect is now treated as unmeasured.
- **Mangled class stereotypes.** Stereotype labels (`«interface»`, `«enumeration»`) used a relative `font-size` (`85%`) and cumulative `<tspan dy>` offsets — which browsers resolve but other renderers don't, so the guillemets ballooned over and overlapped the class name. Relative font sizes now resolve to absolute px and tspan offsets to absolute `y`.
- **Mispositioned labels.** Node text is centred with `dominant-baseline`, which non-browser renderers ignore — drawing every label at the alphabetic baseline (too high). It's now resolved to an explicit `y`, so text lands where the editor puts it everywhere.
