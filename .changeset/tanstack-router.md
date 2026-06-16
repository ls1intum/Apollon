---
"@tumaet/webapp": patch
---

Migrate the web app's router from react-router to TanStack Router. Routing is now file-based with fully type-safe path params and URL search state — including the version-preview `?version=` parameter and the shared-editor `?view=` mode — and route components are code-split automatically. This is an internal refactor: URLs and deep links are unchanged.
