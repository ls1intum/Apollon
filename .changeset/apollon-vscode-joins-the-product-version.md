---
"apollon-vscode": patch
---

Apollon for VS Code now carries the same version as the rest of Apollon, so the extension you install and the library it renders with are one number.

If you have used the extension before, version `0.0.17` wrote `"files.associations": { "*.apollon": "json" }` into your user settings every time it started. Nothing writes or needs it now. Diagrams open in the Apollon editor either way, but while that line remains, opening one as text shows it as plain JSON instead of an Apollon diagram. Deleting it restores the file icon and syntax highlighting.
