# @tumaet/server

## 4.5.0

### Patch Changes

- [#701](https://github.com/ls1intum/Apollon/pull/701) Thanks [@tamang29](https://github.com/tamang29)! - `CORS_ORIGIN` now accepts a comma-separated allowlist, so you can permit the mobile app origins (`capacitor://localhost`, `ionic://localhost`) alongside the web app without loosening CORS to a wildcard. Operators: add the mobile origins to `CORS_ORIGIN` when shipping the apps.

- [#689](https://github.com/ls1intum/Apollon/pull/689) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - The Redis Stack container now persists to the `/data` volume (`--dir /data`). It previously defaulted to `/var/lib/redis-stack` — the container's ephemeral layer — so diagrams written between deploys could be silently lost. Operators: redeploy the database so it picks up the corrected data directory.

- Updated dependencies [[`6c5dc2a`](https://github.com/ls1intum/Apollon/commit/6c5dc2acf927a8cddccbc1eed943fdb77dcf9b06), [`6c5dc2a`](https://github.com/ls1intum/Apollon/commit/6c5dc2acf927a8cddccbc1eed943fdb77dcf9b06), [`6c5dc2a`](https://github.com/ls1intum/Apollon/commit/6c5dc2acf927a8cddccbc1eed943fdb77dcf9b06), [`6c5dc2a`](https://github.com/ls1intum/Apollon/commit/6c5dc2acf927a8cddccbc1eed943fdb77dcf9b06), [`6c5dc2a`](https://github.com/ls1intum/Apollon/commit/6c5dc2acf927a8cddccbc1eed943fdb77dcf9b06), [`6c5dc2a`](https://github.com/ls1intum/Apollon/commit/6c5dc2acf927a8cddccbc1eed943fdb77dcf9b06), [`6c5dc2a`](https://github.com/ls1intum/Apollon/commit/6c5dc2acf927a8cddccbc1eed943fdb77dcf9b06)]:
  - @tumaet/apollon@4.5.0

## 4.4.1

No server-side changes; released alongside [`@tumaet/webapp@4.4.1`](../webapp/CHANGELOG.md#441).

## 4.4.0

### Major Changes

- [#657](https://github.com/ls1intum/Apollon/pull/657) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Migrates diagram storage from Redis `STRING` keys to RedisJSON on Redis Stack 7.4, with a sibling `:meta` HASH per diagram. API routes move from `/api/<id>` to `/api/diagrams/<id>`. `OWNER_SECRET` (≥ 32 chars) is now required. Deployment runbook in the [GitHub Release](https://github.com/ls1intum/Apollon/releases/tag/v4.4.0).

### Minor Changes

- [#657](https://github.com/ls1intum/Apollon/pull/657) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Versioning API at `/api/diagrams/<id>/versions` and atomic Lua functions (`commit_snapshot`, `restore_version`, `evict_with_priority`) loaded at boot. 30-minute server-side auto-snapshots; typed WebSocket control envelope for cross-tab version events.
