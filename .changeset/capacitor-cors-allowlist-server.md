---
"@tumaet/server": patch
---

`CORS_ORIGIN` now accepts a comma-separated allowlist, so a deployment can permit the mobile app origins (`capacitor://localhost`, `ionic://localhost`) alongside the web app without weakening CORS (no wildcard, credentials preserved). Operators: add the mobile origins to `CORS_ORIGIN` when shipping the app.
