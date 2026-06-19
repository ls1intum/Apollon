---
"@tumaet/webapp": patch
---

Fixes PNG and PDF export on large or complex diagrams. Exporting one used to do nothing — the menu closed and either no file or a 0-byte image was saved. Now the PNG downloads reliably, the PDF stays sharp at any zoom, and if a diagram is too large to export the app tells you instead of failing silently.
