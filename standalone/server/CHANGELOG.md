# @tumaet/server

## 4.6.0

### Patch Changes

- Updated dependencies [[`1fdb9bc`](https://github.com/ls1intum/Apollon/commit/1fdb9bc70b2fcfc119619876d595b36eebb36f8a), [`dfb4479`](https://github.com/ls1intum/Apollon/commit/dfb4479bbf15671a6332c96b659efd9dd31c127b)]:
  - @tumaet/apollon@4.6.0

## 4.5.1

### Patch Changes

- [#741](https://github.com/ls1intum/Apollon/pull/741) [`2360882`](https://github.com/ls1intum/Apollon/commit/2360882ff2ae4195b1d195d675695dcf1f8158b3) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Fix Apollon PDF export (`POST /api/converter/pdf`), which returned 500 on every request after the pdfmake 0.2 → 0.3 upgrade: fonts were registered through the removed `pdfMake.vfs` setter and `getBuffer` used the dropped callback overload, so every render crashed in svg-to-pdfkit. The worker now registers fonts via `addVirtualFileSystem()` and awaits the Promise-based `getBuffer()`. Operators: redeploy the server to restore diagram PDF export.

- [#740](https://github.com/ls1intum/Apollon/pull/740) [`a00ecae`](https://github.com/ls1intum/Apollon/commit/a00ecaeea33ffee78f448303fb54d31416a6ff6f) Thanks [@tamang29](https://github.com/tamang29)! - Operators can enable the mobile app origins for the server CORS allowlist through the Docker deployment configuration.

## 4.5.0

### Patch Changes

- [#701](https://github.com/ls1intum/Apollon/pull/701) Thanks [@tamang29](https://github.com/tamang29)! - `CORS_ORIGIN` now accepts a comma-separated allowlist, so you can permit the mobile app origins (`capacitor://localhost`, `ionic://localhost`) alongside the web app without loosening CORS to a wildcard. Operators: add the mobile origins to `CORS_ORIGIN` when shipping the apps.

- [#689](https://github.com/ls1intum/Apollon/pull/689) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - The Redis Stack container now persists to the `/data` volume (`--dir /data`). It previously defaulted to `/var/lib/redis-stack` — the container's ephemeral layer — so diagrams written between deploys could be silently lost. Operators: redeploy the database so it picks up the corrected data directory.

- Updated dependencies:
  - @tumaet/apollon@4.6.0

## 4.4.1

No server-side changes; released alongside [`@tumaet/webapp@4.4.1`](../webapp/CHANGELOG.md#441).

## 4.4.0

### Major Changes

- [#657](https://github.com/ls1intum/Apollon/pull/657) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Migrates diagram storage from Redis `STRING` keys to RedisJSON on Redis Stack 7.4, with a sibling `:meta` HASH per diagram. API routes move from `/api/<id>` to `/api/diagrams/<id>`. `OWNER_SECRET` (≥ 32 chars) is now required. Deployment runbook in the [GitHub Release](https://github.com/ls1intum/Apollon/releases/tag/v4.4.0).

### Minor Changes

- [#657](https://github.com/ls1intum/Apollon/pull/657) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Versioning API at `/api/diagrams/<id>/versions` and atomic Lua functions (`commit_snapshot`, `restore_version`, `evict_with_priority`) loaded at boot. 30-minute server-side auto-snapshots; typed WebSocket control envelope for cross-tab version events.
