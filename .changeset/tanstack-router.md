---
"@tumaet/webapp": patch
---

Migrate the web app's router from react-router to TanStack Router. This is an internal refactor — URLs and deep links, including the version-preview `?version=` and shared-editor `?view=` params, are unchanged — that gives the routes type-safe params and automatic per-route code-splitting.
