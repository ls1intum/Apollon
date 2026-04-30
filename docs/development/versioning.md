# Version history

Apollon Standalone gives every diagram a Figma-shaped version history:
**named versions** the user creates as deliberate milestones, plus
**autosaves** the server places automatically at a regular cadence so the
user can recover from "I lost an hour ago" mistakes without naming
anything.

## What ships

### Triggers

- **Manual:** "Save version" in the right-anchored drawer (or ⌘⇧S /
  Ctrl+Shift+S). Composer is a single freeform area — line 1 becomes the
  name, lines 2+ the description.
- **Automatic (every 30 min):** the HEAD PUT path attempts a per-diagram
  Redis `SET NX EX 1800` on `diagram:{id}:auto-version-marker`. On
  acquire, the server diffs HEAD against the latest snapshot's body
  (`structuralFingerprint` — order-stable JSON over title/type/version/
  nodes/edges/assessments). If the fingerprints differ it commits an
  empty-name `kind: "auto"` row; if they match the marker stays for the
  full 30 min so the next 5-second autosave PUT doesn't re-evaluate.
- **Pre-restore safety:** Restore captures the user's pre-restore canvas
  as a `kind: "auto"` row whose `name` is auto-generated
  (`Before restoring 'X'`). The non-empty name protects it from
  eviction priority — see below.

### Display rule (named ≠ kind)

Versions live in the same right-rail sidebar regardless of `kind`. The
visual split is `name`/`description` emptiness:

- **Named row** (`name` *or* `description` non-empty) — full-fat row
  with thumbnail and meta. *Always* a milestone, never collapsed.
- **Unnamed row** (both empty) — eligible for collapse. Contiguous
  unnamed rows fold under an "N auto-saved versions" expander between
  named milestones, exactly the way Figma does it.

The "Name this version" menu action on an unnamed row is pure metadata:
it sets `name` (and optionally `description`) via PATCH, and the row
visually promotes itself out of the collapsed group on the next render.
There is no "kind upgrade," no `VERSION_PROMOTED` envelope, no
collaborator race. `kind` records origin only.

### Filter toggle

A "Show autosave versions" icon (mirrors Figma's filter) at the top of
the sidebar hides every unnamed row when off. Default ON. Implemented
purely client-side; the server still keeps the rows.

### Eviction priority

The 50-version FIFO cap is **single-bucket** but eviction picks victims
by *name-emptiness* before age:

```text
need = ZCARD(versionsIndex) - MAX_VERSIONS

pass 1: drop oldest unnamed-meta rows (`name`='' AND `description`='')
pass 2: only if pass 1 was insufficient, drop oldest named rows
```

Implemented in the Lua function library `apollon` (`evict_with_priority`
in `standalone/server/src/redis.ts`). Both `commit_snapshot` and
`restore_version` call it.

This means: a chatty 30-min auto cadence cannot silently displace the
user's deliberately-named milestones. Pre-restore rows are protected by
their auto-generated name. Truly unnamed autosaves are recovery
infrastructure and disposable.

### Dirty detection

Save-button enablement uses a structural fingerprint of `editor.model`,
not the Yjs state vector. The fingerprint is `JSON.stringify` over a
`{ nodes, edges, assessments, title, type }` projection with a replacer
that drops volatile fields:

```text
selected, dragging, resizing, hidden, measured,
selectable, draggable, connectable, deletable
```

**Why not the SV directly?** React-Flow writes layout noise to the same
Y.Maps as user content — clicking a node fires a `dimensions` change
that re-stamps `measured` on the node and bumps the SV. The SV answers
"has anything in the doc been observed" but the question we want is
"has the user actually changed something." Filtering volatile fields out
of a fingerprint is the right semantic — same logic the server uses in
`tryAutoVersion`'s `structuralFingerprint`.

The drawer captures the fingerprint when the latest saved version's id
changes (after a manual save, server-fired auto-version, or
collaborator's save), then on every `subscribeToModelChange` event
recomputes and compares. While previewing (`useVersionStore.preview !==
null`) the gate is forced disabled — saving the previewed body would
just duplicate.

`editor.getStateVector(): Uint8Array` and `editor.getYDoc(): Y.Doc` are
still exposed for hosting apps that need them for transport adapters or
multi-tab coordination, but the version-history dirty gate doesn't use
them.

### Restore (collab)

Restore is currently destructive: HEAD is overwritten and a 10-second
"Undo" snackbar surfaces the pre-restore snapshot. The Y.Doc on every
client is hard-reset by replacing `editor.model`. The library's preview
mode (`editor.setReadonly(true)`) handles "view this version" — it's
the existing analogue to Figma's non-destructive restore.

### Thumbnails (client-side)

Per-version thumbnails are rendered in the browser by feeding the
snapshot's JSON body through `ApollonEditor.exportModelAsSvg`. Lazy-
loaded via `IntersectionObserver`, serialized through a single-flight
queue (each render mounts a temporary 4000×4000 div in the DOM, so we
don't stack them), cached forever in a module-level `Map` keyed by
`[diagramId, versionId]`. Snapshots are immutable so the cache never
needs to invalidate.

This explicitly is *not* a server endpoint. Booting JSDOM + the full
library bundle on the backend for a 64×40 thumbnail is the wrong
tradeoff: it adds cold-start latency, doesn't scale with diagram count,
and doesn't work in the no-server deployment. The PDF export path
(`POST /converter/pdf` → `pdf-conversion-worker-thread`) still uses
`ConversionService.convertToSvg` server-side — that's a separate
high-quality export use case, not a per-row preview.

### Storage model

Per diagram, **at most 50 versions** with the eviction priority above.
Bodies are gzipped before storage.

| Key | Type | TTL |
|---|---|---|
| `diagram:{<id>}` | RedisJSON | 120 d sliding |
| `diagram:{<id>}:meta` | HASH | sliding parity |
| `diagram:{<id>}:versions` | ZSET (score=ms, member=ULID) | 121 d on touch |
| `diagram:{<id>}:version:{<vid>}` | gzipped STRING | 121 d at creation |
| `diagram:{<id>}:version:{<vid>}:meta` | HASH | 121 d at creation |
| `diagram:{<id>}:auto-version-marker` | STRING (1) | 1800 s (interval) |

The Lua function library `apollon` is loaded at boot via
`FUNCTION LOAD REPLACE` and exposes:

- `commit_snapshot` — write a snapshot, FIFO-prune via
  `evict_with_priority`.
- `restore_version` — atomic auto-snapshot + HEAD swap; same eviction
  priority.
- `list_versions_before` — cursor pagination stable across same-ms
  ties.

### Configuration

| Env | Default | Meaning |
|---|---|---|
| `MAX_VERSIONS_PER_DIAGRAM` | 50 | Single-bucket cap. |
| `AUTO_VERSION_INTERVAL_SECONDS` | 1800 (30 min) | Marker TTL = trigger gap. |
| `MAX_NAME_LENGTH` | 80 | Server-side validation. |
| `MAX_DESCRIPTION_LENGTH` | 240 | Server-side validation. |
| `VERSION_TTL_SECONDS` | 121 d | Snapshot retention. |
| `DIAGRAM_TTL_SECONDS` | 120 d | HEAD retention. |

## Consistency contract

1. **HEAD writes are last-write-wins.** Autosave PUT sends an
   `If-Match: <lastObservedHeadRev>` advisory header. On `409
   REVISION_MISMATCH`, the client refetches HEAD, re-applies its
   in-memory model on top, and retries — local model wins. Surfaced
   briefly to the user as "Synced changes from another collaborator."

2. **Auto-versions are a fire-and-forget side effect of HEAD PUT.** They
   never block the response. Failures are logged and observable but
   don't surface to the user — HEAD already persisted. The `tryAutoVersion`
   helper in `standalone/server/src/services/autoVersion.ts` owns the
   lifecycle: marker acquire → fingerprint compare → commit + relay.

3. **Snapshots capture the user's canvas, not Redis HEAD.** `POST
   /versions` accepts the `body` inline; the server flushes-then-snapshots
   atomically.

4. **Restore captures the restoring user's canvas as `kind="auto"` with
   a generated name first**, then overwrites HEAD. Other collaborators
   refetch HEAD via the WS-driven control envelope. Local in-flight
   Yjs edits on collaborators' canvases are dropped — the auto-snapshot
   is the documented recovery path.

5. **All clients including the sender** receive `VERSION_*` envelopes
   (single convergence path; clients dedupe by `versionId`).

6. **Schema versioning**: every snapshot stamps `librarySchemaVersion`.
   On preview/restore, the client routes the body through `importDiagram`
   from `@tumaet/apollon` (the library's universal v2/v3 → v4
   forward-converter) before assigning `editor.model`. Bodies that don't
   match any known shape surface as a toast; the user can fall back to
   "Export as JSON".

7. **Durability**: Redis is configured with `appendonly yes` and
   `appendfsync everysec` — at most ~1s of writes can be lost on hard
   crash. The 50-version cap bounds total Redis memory regardless of
   write rate. Stricter guarantees require replicas (see operations.md).

## Permissions

There is no real auth. URL bearers have full read/write/delete access. A
soft HMAC-signed cookie (`apollon_owner_<id>`) is issued on first
`POST /diagrams` and the first `POST .../versions` per diagram.
Destructive routes set the `X-Owner-Match: true|false` response header.
The webapp uses this only to add a confirm-twice friction prompt for
non-creators — "Heads up — this diagram was originally created in a
different browser. Continue?" Friction, not security.

## Library API additions

```ts
import { ApollonEditor, type UMLModel } from "@tumaet/apollon"

editor.setReadonly(true)              // toggle canvas read-only at runtime
editor.fitView()                      // poll-then-fit; safe right after a model swap
editor.getStateVector(): Uint8Array   // CRDT state vector — embedders use it for
                                      // transport adapters / multi-tab coordination
editor.getYDoc(): Y.Doc               // direct CRDT access for transports
```

The library still exports `diffModel(a, b)` for embedders that want
element-level diffs, but Apollon Standalone no longer uses it: the
in-product compare-versions feature was retired in favor of preview +
restore as the only navigation primitives. Removing it eliminated
~500 lines of UI code and three race-prone async flows. `diffModel`
itself stays — pure-functional, no editor state, useful elsewhere.

## Local-mode versioning (planned)

`ApollonLocal` (no-server deployment) currently has *no* version history
— `usePersistenceModelStore` overwrites a single localStorage entry on
every change. Local-mode users deserve the same Figma-shaped sidebar
this PR ships for collab.

The implementation plan, deferred to a follow-up so this PR's
collab-mode work can ship without coupling to irreversible local
decisions:

- **Storage:** IndexedDB. `localStorage` is sync, string-only, capped at
  ~5–10 MB per origin — wrong tool for gzipped snapshot bodies.
- **Backend abstraction:** introduce a `VersionBackend` interface with
  the same shape as `VersionApiClient`. Two implementations:
  - `HttpVersionBackend` — wraps the existing client, used in collab.
  - `IndexedDbVersionBackend` — stores `{ meta, gzippedBody }` keyed by
    `[diagramId, versionId]`, mirrors the server's eviction priority
    in TS.
  `useVersionStore` calls the interface; the editor mode picks the impl.
- **Yjs persistence (the irreversible decision):** opt-in `y-indexeddb`
  for the editor's `Y.Doc` so reload preserves CRDT state and two tabs
  on the same local diagram converge via BroadcastChannel. **Once
  shipped, the canonical Y-shape and `schemaVersion` key freeze across
  every browser** that touches the app. This PR pre-pins those
  decisions:
  1. Y-shape stays flat (whole-object Y.Map values, today's shape).
  2. Compaction trigger: on every named-version creation
     (`Y.encodeStateAsUpdate` → `clearData()` → reseed).
  3. Restore is a hard reset of local Y.Doc (`destroy()` → new Y.Doc
     → reseed from JSON via `importDiagram`). No surgical merges.
  4. A `schemaVersion` key in the metadata Y.Map is the escape hatch:
     mismatch on load → export to JSON → `importDiagram` → fresh doc.
- **Multi-tab safety:** `BroadcastChannel` leader election —
  most-recent-focused tab owns the auto-version timer.
- **Migration on Share:** when a local-only diagram becomes
  collaborative, bulk-push local versions in chronological order via a
  `POST .../versions/bulk` route. Cap-aware: if local has 60 named and
  server cap is 50, the oldest 10 are dropped with a one-shot toast.
  Local copy is not deleted; remains as fallback. `pre_restore`-named
  rows are not migrated (disposable by nature).
