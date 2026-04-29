# Version history

Apollon Standalone supports manual and automatic version history per diagram.

## What ships

- **Manual snapshots** — user clicks "Save version" in the right-anchored
  drawer (or hits ⌘⇧S / Ctrl+Shift+S) with an optional name and a 240-char
  description.
- **Automatic snapshots** — created server-side just before any restore so
  the user can always recover their pre-restore canvas.
- **Restore with 10-second Undo** — restoring replaces HEAD; the auto-snapshot
  serves as the recovery anchor for the first 10 seconds via a snackbar.
- **Preview mode** — read-only canvas swap; addressable via the
  `?version=<vid>` URL parameter.
- **Compare versions** — two snapshots side-by-side via the library's
  `diffModel(a, b)` function. Lists added/removed/changed elements by name.
- **Per-version SVG thumbnails** — lazy-loaded via `IntersectionObserver`.
- **Collaborator notifications** — typed control envelopes broadcast over the
  WebSocket relay so all clients converge on version events.

## Storage model

Per diagram, we keep at most **50 versions** (FIFO over both user and
auto-snapshot kinds). Version bodies are gzipped before storage.

| Key | Type | TTL |
|---|---|---|
| `diagram:{<id>}` | RedisJSON | 120 d sliding |
| `diagram:{<id>}:meta` | HASH | sliding parity |
| `diagram:{<id>}:versions` | ZSET (score=ms, member=ULID) | 121 d on touch |
| `diagram:{<id>}:version:{<vid>}` | gzipped STRING | 121 d at creation |
| `diagram:{<id>}:version:{<vid>}:meta` | HASH | 121 d at creation |

The Lua function library `apollon` is loaded at boot via
`FUNCTION LOAD REPLACE` and exposes three functions:
`commit_snapshot` (write a new snapshot, FIFO-prune the index),
`restore_version` (atomic auto-snapshot + HEAD swap in one transaction),
and `list_versions_before` (cursor pagination stable across same-ms ties).

## Consistency contract

1. **HEAD writes are last-write-wins.** Autosave PUT sends an
   `If-Match: <lastObservedHeadRev>` advisory header. On `409
   REVISION_MISMATCH`, the client refetches HEAD, re-applies its in-memory
   model on top, and retries — the local model wins. Surfaced briefly to the
   user as "Synced changes from another collaborator."

2. **Snapshots capture the user's canvas, not Redis HEAD.** `POST /versions`
   accepts the `body` inline; the server flushes-then-snapshots atomically.

3. **Restore captures the restoring user's canvas as `kind="auto"` first**,
   then overwrites HEAD with the chosen version body. Other collaborators
   refetch HEAD via the WS-driven control envelope and rebuild their local
   Y.Doc from it. Local in-flight Yjs edits are dropped — the auto-snapshot
   is the documented recovery path.

4. **All clients including the sender** receive `VERSION_*` envelopes
   (single convergence path; clients dedupe by `versionId`).

5. **Schema versioning**: every snapshot stamps `librarySchemaVersion`. On
   preview/restore, the client routes the body through `importDiagram` from
   `@tumaet/apollon` (the library's universal v2/v3 → v4 forward-converter)
   before assigning `editor.model`. Bodies that don't match any known shape
   surface as a toast; the user can fall back to "Export as JSON".

6. **Durability**: Redis is configured with `appendonly yes` and
   `appendfsync everysec` — at most ~1s of writes can be lost on hard
   crash. The 50-version FIFO cap bounds total Redis memory regardless of
   write rate. Stricter guarantees require replicas (see operations.md).

## Permissions

There is no real auth. URL bearers have full read/write/delete access. A
soft HMAC-signed cookie (`apollon_owner_<id>`) is issued on first
`POST /diagrams` and the first `POST .../versions` per diagram. Destructive
routes set the `X-Owner-Match: true|false` response header. The webapp uses
this only to add a confirm-twice friction prompt for non-creators —
"Heads up — this diagram was originally created in a different browser.
Continue?" Friction, not security.

## Library API

The library exports one new function for v4.4.0:

```ts
import { diffModel, type DiagramDiff, type UMLModel } from "@tumaet/apollon"

const diff: DiagramDiff = diffModel(modelA, modelB)
// diff.added.{nodes,edges}     — new elements
// diff.removed.{nodes,edges}   — removed elements
// diff.changed.{nodes,edges}   — changed elements with fields[]
// diff.totals                   — counts
```

`diffModel` is pure-functional: no editor state, no DOM, no rendering. Used
by Apollon Standalone for the Compare banner; available to any embedder of
the library that wants element-level diff.
