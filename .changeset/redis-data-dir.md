---
"@tumaet/server": patch
---

Redis Stack is now pinned to persist into the `/data` volume (`--dir /data`). Previously it defaulted to `/var/lib/redis-stack`, writing into the container's ephemeral layer, so diagram writes between deploys could be silently lost. Operators: redeploy the database so the container picks up the corrected data directory.
