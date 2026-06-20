# @tumaet/server

## 4.8.0

### Patch Changes

- Updated dependencies [[`82942cd`](https://github.com/ls1intum/Apollon/commit/82942cddec7d3dd33711d3f38eba92e10c1da0c9), [`5013fc6`](https://github.com/ls1intum/Apollon/commit/5013fc632ea0e18c9fce5baf1f66f1d50617a358), [`5d4a8dd`](https://github.com/ls1intum/Apollon/commit/5d4a8dd5d6d34d1c26d4258a99aadc02faca1c17), [`1bb280d`](https://github.com/ls1intum/Apollon/commit/1bb280d23f9a4cfb9339a04b2311c1c50aeffae7)]:
  - @tumaet/apollon@4.8.0

## 4.7.0

### Minor Changes

- [#765](https://github.com/ls1intum/Apollon/pull/765) [`6fe657c`](https://github.com/ls1intum/Apollon/commit/6fe657cfabbb1f60936d03b758039fe1e7fade6f) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Render saved models to SVG and PNG over HTTP, not just PDF.

  `POST /api/converter/svg` and `POST /api/converter/png` join the existing `/api/converter/pdf`, so a model can be converted to any of the three formats in a single request. PNG accepts a `scale` parameter (query or body, `1`–`4`, default `2`), renders sharply at that resolution, and is flattened onto a white background so it isn't transparent. All three share one render worker and queue and inherit the portable `compat` SVG (text centres like the editor everywhere) from `@tumaet/apollon`. SVG and PDF are served verbatim; only the PNG raster is touched — sized to the target resolution and given a hairline stem-darkening stroke so it doesn't read thinner than the vector outputs (Skia lays down less ink than a browser). See the new [Conversion API](https://ls1intum.github.io/Apollon/library/api/conversion-api) reference.

### Patch Changes

- [#765](https://github.com/ls1intum/Apollon/pull/765) [`6fe657c`](https://github.com/ls1intum/Apollon/commit/6fe657cfabbb1f60936d03b758039fe1e7fade6f) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Render text-sized diagrams correctly in the headless SVG/PDF export.

  The server renders under jsdom, which has no canvas, so text measurement degraded to a crude estimate and text-sized diagrams (class, object, communication, sfc) came out with overlapping elements. The export now measures with a real Skia-backed canvas and the bundled Inter font, so node sizes match the editor across all diagram types — no browser required.

  It also guards grading integrity: a submission containing glyphs outside the bundled font's coverage is logged (they would render in a fallback face that may not match the editor), and a node with missing or invalid dimensions is rejected with a `422` naming the node, instead of being silently given a default size.

- Updated dependencies [[`6fe657c`](https://github.com/ls1intum/Apollon/commit/6fe657cfabbb1f60936d03b758039fe1e7fade6f), [`6fe657c`](https://github.com/ls1intum/Apollon/commit/6fe657cfabbb1f60936d03b758039fe1e7fade6f), [`21c6f99`](https://github.com/ls1intum/Apollon/commit/21c6f9914b1ab24d79fa6f6d6527ca6260db8c43), [`1fc31cc`](https://github.com/ls1intum/Apollon/commit/1fc31cc7c1d2c8dedb3555edb5d5d063f572acae)]:
  - @tumaet/apollon@4.8.0

## 4.6.0

### Patch Changes

- Updated dependencies [[`1fdb9bc`](https://github.com/ls1intum/Apollon/commit/1fdb9bc70b2fcfc119619876d595b36eebb36f8a), [`dfb4479`](https://github.com/ls1intum/Apollon/commit/dfb4479bbf15671a6332c96b659efd9dd31c127b)]:
  - @tumaet/apollon@4.8.0

## 4.5.1

### Patch Changes

- [#741](https://github.com/ls1intum/Apollon/pull/741) [`2360882`](https://github.com/ls1intum/Apollon/commit/2360882ff2ae4195b1d195d675695dcf1f8158b3) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Fix Apollon PDF export (`POST /api/converter/pdf`), which returned 500 on every request after the pdfmake 0.2 → 0.3 upgrade: fonts were registered through the removed `pdfMake.vfs` setter and `getBuffer` used the dropped callback overload, so every render crashed in svg-to-pdfkit. The worker now registers fonts via `addVirtualFileSystem()` and awaits the Promise-based `getBuffer()`. Operators: redeploy the server to restore diagram PDF export.

- [#740](https://github.com/ls1intum/Apollon/pull/740) [`a00ecae`](https://github.com/ls1intum/Apollon/commit/a00ecaeea33ffee78f448303fb54d31416a6ff6f) Thanks [@tamang29](https://github.com/tamang29)! - Operators can enable the mobile app origins for the server CORS allowlist through the Docker deployment configuration.

## 4.5.0

### Patch Changes

- [#701](https://github.com/ls1intum/Apollon/pull/701) Thanks [@tamang29](https://github.com/tamang29)! - `CORS_ORIGIN` now accepts a comma-separated allowlist, so you can permit the mobile app origins (`capacitor://localhost`, `ionic://localhost`) alongside the web app without loosening CORS to a wildcard. Operators: add the mobile origins to `CORS_ORIGIN` when shipping the apps.

- [#689](https://github.com/ls1intum/Apollon/pull/689) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - The Redis Stack container now persists to the `/data` volume (`--dir /data`). It previously defaulted to `/var/lib/redis-stack` — the container's ephemeral layer — so diagrams written between deploys could be silently lost. Operators: redeploy the database so it picks up the corrected data directory.

- Updated dependencies:
  - @tumaet/apollon@4.8.0

## 4.4.1

No server-side changes; released alongside [`@tumaet/webapp@4.4.1`](../webapp/CHANGELOG.md#441).

## 4.4.0

### Major Changes

- [#657](https://github.com/ls1intum/Apollon/pull/657) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Migrates diagram storage from Redis `STRING` keys to RedisJSON on Redis Stack 7.4, with a sibling `:meta` HASH per diagram. API routes move from `/api/<id>` to `/api/diagrams/<id>`. `OWNER_SECRET` (≥ 32 chars) is now required. Deployment runbook in the [GitHub Release](https://github.com/ls1intum/Apollon/releases/tag/v4.4.0).

### Minor Changes

- [#657](https://github.com/ls1intum/Apollon/pull/657) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Versioning API at `/api/diagrams/<id>/versions` and atomic Lua functions (`commit_snapshot`, `restore_version`, `evict_with_priority`) loaded at boot. 30-minute server-side auto-snapshots; typed WebSocket control envelope for cross-tab version events.
