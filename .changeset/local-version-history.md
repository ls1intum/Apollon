---
"@tumaet/webapp": minor
---

Add version history to local/offline diagrams (`/local/:id`). You can now save named versions of a diagram that lives only on your device, browse them in the same drawer used for shared diagrams, preview any past version read-only, and restore one — with a "Before restoring …" snapshot written automatically so a restore is always undoable. Versions are stored in IndexedDB (capped per diagram, oldest unnamed ones evicted first) and stay in sync across tabs. Shared diagrams gain a "Save a local copy" action so you can keep an editable copy on your device before the server-side retention window expires.
