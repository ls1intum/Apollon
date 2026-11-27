---
id: valkey-migration
title: Redis Stack to Valkey migration
description: Runbook for moving the Apollon database from Redis Stack to Valkey (valkey-bundle) with a logical copy.
---

# Redis Stack → Valkey migration

Moves the Apollon database from `redis/redis-stack-server` to
`valkey/valkey-bundle` (valkey-json). Do **staging first**, then production.

## Why a logical copy

- Redis Stack 7.4 writes RDB format 12; Valkey 9.2 refuses to load it
  (`Can't handle RDB format version 12`), and the same goes for the RDB base
  file inside `appendonlydir`. Reusing the old data directory does not work.
- `standalone/server/src/scripts/copy-db.ts` reads every key through the wire
  protocol, type-aware (`ReJSON-RL` via `JSON.GET`, hashes, strings, sorted
  sets), writes it to the target and carries the remaining TTL over
  (`PTTL` → `PEXPIRE`). It then re-reads both sides and compares: key set,
  types, canonical JSON per document, hash fields, sorted-set members and
  scores, and TTLs within a tolerance (default 2 s).
- It prints counts only: never document contents, key names or connection
  strings (keys appear as a short hash, URLs as `host:port/db`).
- The Lua function library (`apollon`) is not copied; the server loads it at
  boot.

## Prerequisites

- A server image that accepts the Valkey JSON module (the boot gate change
  from the "accept the Valkey JSON module" PR) is already deployed and running
  against Redis Stack. This makes rollback possible: the same image works on
  both databases.
- The server image you run the copy from contains
  `dist/src/scripts/copy-db.js` (any image built from this change or later).
- Shell access to the Docker host, the `apollon-network` Docker network, and
  enough free disk for a second copy of the data directory (production: tens
  of MB).
- The old data volume is called something like `<project>_dbdata`; find it with
  `docker volume ls | grep dbdata`. **Never run `docker volume prune` or
  `docker compose down -v` during or after the migration** until the rollback
  window (below) has passed.

## Steps

All commands run on the Docker host of the environment being migrated.

1. **Stop writes.** Stop the application server (leave the proxy running so the
   maintenance page can be shown). Record the key count for later:

   ```bash
   docker exec <old-db-container> redis-cli DBSIZE
   docker exec <old-db-container> redis-cli INFO keyspace
   ```

2. **Back up the Redis Stack data directory** (both `dump.rdb` and
   `appendonlydir/`), after forcing a fresh RDB:

   ```bash
   docker exec <old-db-container> redis-cli SAVE
   mkdir -p /srv/backups
   docker run --rm -v <old-volume>:/data:ro -v /srv/backups:/backup alpine \
     tar czf /backup/apollon-redis-stack-$(date +%F).tgz -C /data .
   tar tzf /srv/backups/apollon-redis-stack-*.tgz | grep -E 'dump.rdb|appendonlydir'
   ```

3. **Start a read-only legacy copy to read from.** The new database replaces
   the `db` service, so the old server will no longer exist after step 4. Copy
   the volume and start Redis Stack from the copy (same pinned image as the
   old compose file), reachable as `db-legacy`:

   ```bash
   docker volume create apollon-legacy-data
   docker run --rm -v <old-volume>:/from:ro -v apollon-legacy-data:/to alpine \
     sh -c 'cp -a /from/. /to/'
   docker run -d --name db-legacy --network apollon-network \
     -v apollon-legacy-data:/data \
     redis/redis-stack-server:7.4.0-v8@sha256:798ab84d9f266936b034ab11c4d04a2b8e4b441884c5aa7d17ac951eefdf742a \
     redis-stack-server --dir /data --appendonly yes --appendfsync everysec
   docker exec db-legacy redis-cli DBSIZE   # must match step 1
   ```

4. **Deploy the Valkey database.** Deploy `docker/compose.db.yml` from this
   change (the deploy workflows' `deploy-db` option, or
   `docker compose -f docker/compose.db.yml up -d` in the db project directory).
   It replaces the `db` container and creates the new `valkeydata` volume; the
   old volume stays untouched. Check:

   ```bash
   docker exec <new-db-container> valkey-cli MODULE LIST   # json, search, bf, ldap, lua
   docker exec <new-db-container> valkey-cli DBSIZE        # 0
   ```

5. **Copy.** Dry run first, then the real copy (the tool refuses a non-empty
   target; `--allow-non-empty-target` overwrites same-named keys and is only
   for re-runs):

   ```bash
   docker run --rm --network apollon-network \
     -e SOURCE_REDIS_URL=redis://db-legacy:6379 \
     -e TARGET_REDIS_URL=redis://db:6379 \
     ghcr.io/ls1intum/apollon/server:<tag> \
     node dist/src/scripts/copy-db.js --dry-run
   # same command without --dry-run
   ```

   Success is `"msg":"verification passed"` with `mismatchCount: 0`, and
   `copied` equal to the step 1 key count. Exit codes: `0` ok, `1`
   verification mismatch, `2` refused or failed. Useful flags: `--verify-only`,
   `--no-verify`, `--ttl-tolerance-ms=N`. To re-check later: run again with
   `--verify-only`.

6. **Start the application server** and verify:
   - `/health/ready` returns `ok` (the `apollon` Lua library is loaded) and the
     server log shows `redis.function.loaded` with `jsonModule: "valkey-json"`.
   - Open a known diagram, edit it, save a named version, restore it.
   - `docker exec <new-db-container> valkey-cli FUNCTION LIST LIBRARYNAME apollon`.

7. **Clean up the temporary container only after the rollback window:**
   `docker rm -f db-legacy` and `docker volume rm apollon-legacy-data`. Keep the
   backup archive and the old `dbdata` volume for at least two weeks.

## Rollback

- **Before the application server was started on Valkey (no new writes):**
  deploy the previous `docker/compose.db.yml` (Redis Stack, volume `dbdata`)
  and start the application server. The old volume was never written to, so
  nothing is lost.
- **After the application ran on Valkey:** writes since the cutover exist only
  in Valkey. Stop the application server, start an _empty_ Redis Stack (fresh
  volume), run the same tool in the other direction
  (`SOURCE_REDIS_URL=redis://db:6379`, `TARGET_REDIS_URL=<redis stack url>`;
  the tool accepts either server as source or target), check
  `verification passed`, then deploy the previous compose file pointing at that
  volume. The application server image works on both databases.
- If the copy itself fails or does not verify: nothing has been switched over
  for the application yet. Fix or re-run (empty the target with
  `valkey-cli FLUSHALL`, or use `--allow-non-empty-target`), or roll back as
  above.

## Notes

- `valkey-bundle` auto-loads every module in `/usr/lib/valkey` when the
  command starts with `valkey-server`: json (required), plus search, bloom and
  ldap (unused by Apollon). The search module starts extra worker threads.
- The healthcheck uses `valkey-cli`; `redis-cli` is also present in the image,
  so commands in [`runbook.md`](./runbook.md) work unchanged.
- Persistence flags match the Redis Stack service: `--dir /data`,
  `--appendonly yes`, `--appendfsync everysec`.
