---
"@tumaet/server": patch
---

The Redis Stack container now persists to the `/data` volume (`--dir /data`). It previously defaulted to `/var/lib/redis-stack` — the container's ephemeral layer — so diagrams written between deploys could be silently lost. Operators: redeploy the database so it picks up the corrected data directory.
