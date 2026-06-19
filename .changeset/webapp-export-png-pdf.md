---
"@tumaet/webapp": patch
---

Fix PNG and PDF export for complex diagrams (#667). The export buttons now route through the library's `@tumaet/apollon/export`: PNG renders with resvg (no canvas-area cap, so large diagrams no longer download as a 0-byte file) and PDF is true vector via svg2pdf.js. Export failures now surface a toast with an actionable message instead of silently closing the menu, and PNG that exceeds the pixel budget warns that it was downscaled.
