---
"@tumaet/server": patch
"@tumaet/webapp": patch
---

Review links now prevent changes even when the URL view is changed. Editing requires a write link; older shares remain readable and can be copied into a new share to edit.

Server-rendered previews and exports also avoid repeated viewport transform errors.
