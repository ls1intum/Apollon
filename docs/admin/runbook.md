---
id: runbook
title: Runbook
description: On-call reference for the most likely production issues.
---

# Apollon Standalone runbook

On-call reference for the most likely production issues. Pair with the
[Version history](/contributor/development/versioning) contributor doc
for architecture context.

## Health & quick triage

```bash
# Liveness — Express up + Redis ping reachable.
curl -fsS https://<host>/health
# Returns 200 {"status":"ok"} or 503 on Redis trouble.
```

The server logs are JSON via Pino; correlate by `requestId`:

```bash
# Find every event for a given request:
journalctl -u apollon-standalone -o cat | grep '"requestId":"<id>"'
```

## Stuck or missing snapshot

Symptom: user clicked "Save version," POST returned 5xx, the version
doesn't appear after refresh.

```bash
# Inspect the diagram family.
redis-cli SCAN 0 MATCH 'diagram:{<id>}*' COUNT 200
redis-cli ZRANGE 'diagram:{<id>}:versions' 0 -1 WITHSCORES
redis-cli HGETALL 'diagram:{<id>}:meta'
```

If a version body exists at `diagram:{<id>}:version:<vid>` but is not in
the ZSET index, **delete the orphan**:

```bash
redis-cli DEL 'diagram:{<id>}:version:<vid>' 'diagram:{<id>}:version:<vid>:meta'
```

If a ZSET entry has no body, drop it from the index:

```bash
redis-cli ZREM 'diagram:{<id>}:versions' '<vid>'
```

## Corrupt RedisJSON HEAD

Symptom: GET `/api/diagrams/:id` returns 500 INTERNAL with a JSON parse error
in the logs.

```bash
redis-cli JSON.GET 'diagram:{<id>}' '$'
```

If the JSON is truly corrupt and there is no recoverable HEAD:

1. List versions: `redis-cli ZRANGE 'diagram:{<id>}:versions' 0 -1`
2. Pick the most recent version with `ZREVRANGE`.
3. Restore it via the API: `POST /api/diagrams/:id/versions/<vid>/restore`

## 503 spike

Symptom: `/health` flips to 503; client requests fail with
`REDIS_UNAVAILABLE`.

1. `systemctl status apollon-standalone` — is Express up?
2. `systemctl status redis-stack-server` — is Redis up?
3. `redis-cli INFO replication` — is the primary writable?
4. `redis-cli INFO persistence` — AOF rewrite stuck?
5. `redis-cli FUNCTION LIST` — is the `apollon` library loaded? If not,
   restart the server (boot re-loads idempotently).

## OWNER_SECRET rotation

Rotating `OWNER_SECRET` invalidates **all** soft-ownership claims for
existing diagrams. Users will see the confirm-twice friction prompt on
destructive operations until they re-create the diagram.

Steps:

1. Generate a new secret: `openssl rand -hex 32`
2. Update the deployment env (`OWNER_SECRET=<new>`) and restart the server.
3. Communicate the rotation to active users — destructive ops will now
   show "Heads up — this diagram was originally created in a different
   browser. Continue?"

## Backup posture

Apollon Standalone holds only ephemeral diagram data with a 120-day TTL.
Users export-as-JSON for permanent local copies. AOF (`appendfsync everysec`)
is enabled, so up to ~1s of writes can be lost on a hard crash. Snapshot
and restore endpoints do not call `WAIT` — see `operations.md → Durability`
for the rationale.

## Function reload

The server boot-loads the apollon Lua library via `FUNCTION LOAD REPLACE`.
Verify with:

```bash
redis-cli FUNCTION LIST
# Expected library name: apollon
# Expected functions:    commit_snapshot, restore_version, list_versions_before
```

If the library is missing, restart the server (boot-load is idempotent).

## Clearing all version data

For GDPR right-to-erasure on a single diagram:

```bash
# Delete the entire family (HEAD + meta + versions + bodies).
redis-cli --scan --pattern 'diagram:{<id>}*' | xargs -r redis-cli DEL
```

The webapp's `DELETE /api/diagrams/:id` does this automatically.
