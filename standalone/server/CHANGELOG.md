# @tumaet/server

## 4.4.1

No server-side changes; released alongside [`@tumaet/webapp@4.4.1`](../webapp/CHANGELOG.md#441).

## 4.4.0

### Major Changes

- [#657](https://github.com/ls1intum/Apollon/pull/657) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Migrates diagram storage from Redis `STRING` keys to RedisJSON on Redis Stack 7.4, with a sibling `:meta` HASH per diagram. API routes move from `/api/<id>` to `/api/diagrams/<id>`. `OWNER_SECRET` (≥ 32 chars) is now required. Deployment runbook in the [GitHub Release](https://github.com/ls1intum/Apollon/releases/tag/v4.4.0).

### Minor Changes

- [#657](https://github.com/ls1intum/Apollon/pull/657) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Versioning API at `/api/diagrams/<id>/versions` and atomic Lua functions (`commit_snapshot`, `restore_version`, `evict_with_priority`) loaded at boot. 30-minute server-side auto-snapshots; typed WebSocket control envelope for cross-tab version events.
