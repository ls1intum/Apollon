---
id: operations
title: Operations
description: Required infrastructure, environment variables, durability posture, observability.
---

# Operations

## Required infrastructure

- **Redis Stack** (`redis/redis-stack-server:7.4.0-v8` is the pinned
  image across local, test, and production) — provides RedisJSON ≥ 2.0,
  required for HEAD storage. Plain `redis:7-alpine` / `redis:8-alpine`
  do not bundle the JSON module.
- **Node.js ≥ 24**, **pnpm ≥ 11**.

The server checks `MODULE LIST` at startup and asserts ReJSON is loaded;
on missing module the boot fails closed (process exits non-zero) rather
than serving traffic with broken versioning.

## Environment variables

| Variable                        | Default                  | Purpose                                    |
| ------------------------------- | ------------------------ | ------------------------------------------ |
| `HOST`                          | `localhost`              | Express bind host                          |
| `PORT`                          | `8000`                   | Express HTTP port                          |
| `WS_PORT`                       | `4444`                   | WebSocket relay port                       |
| `CORS_ORIGIN`                   | unset                    | Allowed origin (omit to allow all)         |
| `REDIS_URL`                     | `redis://localhost:6379` | Redis connection                           |
| `OWNER_SECRET`                  | dev placeholder          | HMAC secret for soft owner cookie          |
| `MAX_VERSIONS_PER_DIAGRAM`      | `50`                     | FIFO cap on version history                |
| `MAX_SNAPSHOT_BYTES`            | `5242880`                | Body parser hard limit (5 MiB)             |
| `MAX_DESCRIPTION_LENGTH`        | `240`                    | Version description char limit             |
| `MAX_NAME_LENGTH`               | `80`                     | Version name char limit                    |
| `DIAGRAM_TTL_SECONDS`           | `10368000`               | HEAD TTL (120 d)                           |
| `VERSION_TTL_SECONDS`           | `10454400`               | Version body+meta TTL (121 d)              |
| `AUTO_VERSION_INTERVAL_SECONDS` | `1800`                   | Marker TTL = auto-version cadence (30 min) |

## Durability

Redis is configured with:

- `appendonly yes` — AOF on
- `appendfsync everysec` — at most ~1s of writes can be lost on a hard
  crash. Applies uniformly to autosave PUTs and snapshot/restore commits;
  there is no per-route fsync gate.

For a stricter durability story, deploy a Redis replica and set
`min-replicas-to-write 1` plus `min-replicas-max-lag 10`. The application
does not call `WAIT` — that command requires configured replicas to
provide any guarantee, and we deliberately don't claim a guarantee that
isn't real.

Recommended additional ops:

- RDB BGSAVE every 6 hours
- Off-site backup of the `dbdata` volume nightly

## Single-replica WebSocket

The relay server is in-memory (`Map<diagramId, Set<WebSocket>>`). It is
**not multi-replica safe** — clients on different replicas cannot see each
other. Production deploys must:

1. Run a single relay replica behind a sticky load balancer, or
2. Move to a Redis Pub/Sub adapter (deferred; tracked separately).

## Redis Functions lifecycle

The server boot-loads one Lua library named `apollon` containing three
functions: `commit_snapshot`, `restore_version`, and
`list_versions_before`. Verify with `redis-cli FUNCTION LIST` (the library
name `apollon` should appear). Idempotent across restarts; the library
survives Redis restart because Redis Functions are persisted to AOF/RDB.

## Migration: legacy STRING → RedisJSON

Pre-existing `diagram:{<id>}` keys stored as plain JSON STRINGs (legacy
format) are upgraded by:

```bash
pnpm --filter @tumaet/server run migrate:string-to-json
```

The script:

- Scans `diagram:*`
- Skips any key that's already RedisJSON-typed
- Reads STRING bodies, JSON.SETs them back, preserves TTL
- Refuses to leave any STRING-typed `diagram:*` HEAD keys behind
  (boot-gate equivalent)

Idempotent. Safe to re-run.

## Observability

The server emits JSON logs via Pino. Every version event is structured:

```json
{
  "level": 30,
  "event": "version.created",
  "diagramId": "...",
  "versionId": "01JKQ...",
  "kind": "user",
  "evictedVersionIds": [],
  "librarySchemaVersion": "4.4.0",
  "requestId": "...",
  "msg": "version.created"
}
```

`x-request-id` is propagated to all error response bodies — quote it when
filing support tickets.

A Prometheus `/metrics` endpoint is **not** included in this release.
Add `prom-client` and a `/metrics` route if a downstream SRE consumer
requires it.

## See also

- [Version history (developer doc)](https://ls1intum.github.io/Apollon/contributor/development/diagram-version-history)
- [Runbook](runbook.md)
