---
"@tumaet/server": patch
---

`CORS_ORIGIN` now accepts a comma-separated allowlist, so you can permit the mobile app origins (`capacitor://localhost`, `ionic://localhost`) alongside the web app without loosening CORS to a wildcard. Operators: add the mobile origins to `CORS_ORIGIN` when shipping the apps.
