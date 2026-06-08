---
"@tumaet/server": patch
---

Fix Apollon PDF export (`POST /api/converter/pdf`), which returned 500 on every request after the pdfmake 0.2 → 0.3 upgrade: fonts were registered through the removed `pdfMake.vfs` setter and `getBuffer` used the dropped callback overload, so every render crashed in svg-to-pdfkit. The worker now registers fonts via `addVirtualFileSystem()` and awaits the Promise-based `getBuffer()`. Operators: redeploy the server to restore diagram PDF export.
