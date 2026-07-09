# @tumaet/server

## 5.1.0

### Patch Changes

- Updated dependencies [[`e108b79`](https://github.com/ls1intum/Apollon/commit/e108b79955d159104db6809077ca4d7255ae1a20), [`8905b71`](https://github.com/ls1intum/Apollon/commit/8905b714f4815e5ade163e9144b424b97f13859c), [`43d2739`](https://github.com/ls1intum/Apollon/commit/43d2739873d1ed9e65a72ef14caf5e3f2a0e1833), [`0ac2478`](https://github.com/ls1intum/Apollon/commit/0ac2478749e3deef74f3ddadbae6dc87191c56a2), [`0ac2478`](https://github.com/ls1intum/Apollon/commit/0ac2478749e3deef74f3ddadbae6dc87191c56a2), [`474029e`](https://github.com/ls1intum/Apollon/commit/474029ea8c2fbc39b73fd86b2f6e91e5bef9ceee), [`930b10c`](https://github.com/ls1intum/Apollon/commit/930b10c2fbf3e7c4b5c8b5afe5b430c44700dbf7), [`882b88c`](https://github.com/ls1intum/Apollon/commit/882b88cf517f2caaeb2e189d7df7a7b3282a1bf6), [`cba2d71`](https://github.com/ls1intum/Apollon/commit/cba2d7113457a8df4e3337a72d1574b79a33690c), [`9c4782c`](https://github.com/ls1intum/Apollon/commit/9c4782c639d051100440f1141bde877ae8d4928a)]:
  - @tumaet/apollon@5.1.0

## 5.0.1

### Patch Changes

- Updated dependencies [[`82ef0af`](https://github.com/ls1intum/Apollon/commit/82ef0af97792d17495f318ebdfee908ba0cdbf13)]:
  - @tumaet/apollon@5.1.0

## 5.0.0

### Patch Changes

- [#786](https://github.com/ls1intum/Apollon/pull/786) [`16e90a7`](https://github.com/ls1intum/Apollon/commit/16e90a739b5e50938fd9276660494b317473d6ca) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Modernize the standalone runtimes, behavior-preserving.

  **Server:** migrate Express 5 → Hono 4 + `@hono/node-server` (both zero-runtime-dependency), dropping `express`/`cors`/`cookie`/`pino-http` and ~18 transitives. Routes, status codes, response bodies/headers, the owner-cookie HMAC, CORS policy, the zod error envelopes and the yjs collaboration WebSocket relay are all preserved. Runtime majors bumped: zod 4, redis 6 (RESP2-pinned to keep raw reply shapes), pino 10, ulid 3, and `dotenv` replaced by Node's built-in `util.parseEnv`.

  **Webapp:** replace `@ionic/react` (imported only for `isPlatform()` UA checks) with a 45-line vendored `platform.ts`, cutting the Stencil runtime from the initial bundle (~−47% initial gzip) and de-duplicating the editor; `uuid` → native `crypto.randomUUID`.

- Updated dependencies [[`16e90a7`](https://github.com/ls1intum/Apollon/commit/16e90a739b5e50938fd9276660494b317473d6ca), [`e4a44f2`](https://github.com/ls1intum/Apollon/commit/e4a44f200c864e8684d01bf4113968c7dfc7fa96), [`e4a44f2`](https://github.com/ls1intum/Apollon/commit/e4a44f200c864e8684d01bf4113968c7dfc7fa96), [`91d36ad`](https://github.com/ls1intum/Apollon/commit/91d36addd69f1982c79df1dfc68c8a5da17e7f8a)]:
  - @tumaet/apollon@5.1.0

## 4.9.0

### Minor Changes

- [#677](https://github.com/ls1intum/Apollon/pull/677) [`41059b1`](https://github.com/ls1intum/Apollon/commit/41059b1c93e4edc483c8f0c039d4378a7bab2489) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Embed your diagrams anywhere. Drop one into a README, an issue, a pull request, or any page as a Markdown image — it renders inline as a polished framed card with the diagram, its title, and an "Open in Apollon" button, matches light and dark themes, and updates as you keep editing — or paste a ready-made iframe snippet. The share dialog gains an "Embed" panel with copy-paste code, and embedding needs no sign-in or tokens: the diagram link is the key, exactly like opening it in the editor. Sharing now leads with live collaboration by default, and the dialog uploads a single shared copy whose access (collaborate, edit, or feedback) you can switch without ever creating duplicates. Embedded diagrams stay alive as long as they're viewed, so they won't quietly disappear from a README, and a popular one stays fast no matter how many people open it.

### Patch Changes

- [#677](https://github.com/ls1intum/Apollon/pull/677) [`41059b1`](https://github.com/ls1intum/Apollon/commit/41059b1c93e4edc483c8f0c039d4378a7bab2489) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Server-rendered diagram images and PDFs now include edges that connect to a node's in-between anchor points. Previously such an edge was silently dropped from the export, so a diagram could come out with its boxes but a missing connection.

- [#677](https://github.com/ls1intum/Apollon/pull/677) [`41059b1`](https://github.com/ls1intum/Apollon/commit/41059b1c93e4edc483c8f0c039d4378a7bab2489) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Server-rendered diagram images and PDFs now place edge labels on their edge (at the path midpoint) instead of at a fallback point off to the side. Edge-relative decorators (e.g. the SFC transition condition) are positioned the same way.

- Updated dependencies [[`8251733`](https://github.com/ls1intum/Apollon/commit/8251733a965e9fd3cd0beb7565e3abf138a895d5), [`d03f562`](https://github.com/ls1intum/Apollon/commit/d03f562b3fabfc92e7cff870fe08061d678926f6), [`2115fe3`](https://github.com/ls1intum/Apollon/commit/2115fe3d2c787a9055e6d9fbeab61a122eaaf6eb), [`295a627`](https://github.com/ls1intum/Apollon/commit/295a627e1067c0d23fd71ef3e26c8554a4a6e073), [`515777b`](https://github.com/ls1intum/Apollon/commit/515777ba6a45c0110adfa24c1fdb76251d0e9636), [`451ca97`](https://github.com/ls1intum/Apollon/commit/451ca97872d1afb5478e628179151f7acc71aab7)]:
  - @tumaet/apollon@5.1.0

## 4.8.0

### Patch Changes

- Updated dependencies [[`82942cd`](https://github.com/ls1intum/Apollon/commit/82942cddec7d3dd33711d3f38eba92e10c1da0c9), [`5013fc6`](https://github.com/ls1intum/Apollon/commit/5013fc632ea0e18c9fce5baf1f66f1d50617a358), [`5d4a8dd`](https://github.com/ls1intum/Apollon/commit/5d4a8dd5d6d34d1c26d4258a99aadc02faca1c17), [`1bb280d`](https://github.com/ls1intum/Apollon/commit/1bb280d23f9a4cfb9339a04b2311c1c50aeffae7)]:
  - @tumaet/apollon@5.1.0

## 4.7.0

### Minor Changes

- [#765](https://github.com/ls1intum/Apollon/pull/765) [`6fe657c`](https://github.com/ls1intum/Apollon/commit/6fe657cfabbb1f60936d03b758039fe1e7fade6f) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Render saved models to SVG and PNG over HTTP, not just PDF.

  `POST /api/converter/svg` and `POST /api/converter/png` join the existing `/api/converter/pdf`, so a model can be converted to any of the three formats in a single request. PNG accepts a `scale` parameter (query or body, `1`–`4`, default `2`), renders sharply at that resolution, and is flattened onto a white background so it isn't transparent. All three share one render worker and queue and inherit the portable `compat` SVG (text centres like the editor everywhere) from `@tumaet/apollon`. SVG and PDF are served verbatim; only the PNG raster is touched — sized to the target resolution and given a hairline stem-darkening stroke so it doesn't read thinner than the vector outputs (Skia lays down less ink than a browser). See the new [Conversion API](https://ls1intum.github.io/Apollon/library/api/conversion-api) reference.

### Patch Changes

- [#765](https://github.com/ls1intum/Apollon/pull/765) [`6fe657c`](https://github.com/ls1intum/Apollon/commit/6fe657cfabbb1f60936d03b758039fe1e7fade6f) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Render text-sized diagrams correctly in the headless SVG/PDF export.

  The server renders under jsdom, which has no canvas, so text measurement degraded to a crude estimate and text-sized diagrams (class, object, communication, sfc) came out with overlapping elements. The export now measures with a real Skia-backed canvas and the bundled Inter font, so node sizes match the editor across all diagram types — no browser required.

  It also guards grading integrity: a submission containing glyphs outside the bundled font's coverage is logged (they would render in a fallback face that may not match the editor), and a node with missing or invalid dimensions is rejected with a `422` naming the node, instead of being silently given a default size.

- Updated dependencies [[`6fe657c`](https://github.com/ls1intum/Apollon/commit/6fe657cfabbb1f60936d03b758039fe1e7fade6f), [`6fe657c`](https://github.com/ls1intum/Apollon/commit/6fe657cfabbb1f60936d03b758039fe1e7fade6f), [`21c6f99`](https://github.com/ls1intum/Apollon/commit/21c6f9914b1ab24d79fa6f6d6527ca6260db8c43), [`1fc31cc`](https://github.com/ls1intum/Apollon/commit/1fc31cc7c1d2c8dedb3555edb5d5d063f572acae)]:
  - @tumaet/apollon@5.1.0

## 4.6.0

### Patch Changes

- Updated dependencies [[`1fdb9bc`](https://github.com/ls1intum/Apollon/commit/1fdb9bc70b2fcfc119619876d595b36eebb36f8a), [`dfb4479`](https://github.com/ls1intum/Apollon/commit/dfb4479bbf15671a6332c96b659efd9dd31c127b)]:
  - @tumaet/apollon@5.1.0

## 4.5.1

### Patch Changes

- [#741](https://github.com/ls1intum/Apollon/pull/741) [`2360882`](https://github.com/ls1intum/Apollon/commit/2360882ff2ae4195b1d195d675695dcf1f8158b3) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Fix Apollon PDF export (`POST /api/converter/pdf`), which returned 500 on every request after the pdfmake 0.2 → 0.3 upgrade: fonts were registered through the removed `pdfMake.vfs` setter and `getBuffer` used the dropped callback overload, so every render crashed in svg-to-pdfkit. The worker now registers fonts via `addVirtualFileSystem()` and awaits the Promise-based `getBuffer()`. Operators: redeploy the server to restore diagram PDF export.

- [#740](https://github.com/ls1intum/Apollon/pull/740) [`a00ecae`](https://github.com/ls1intum/Apollon/commit/a00ecaeea33ffee78f448303fb54d31416a6ff6f) Thanks [@tamang29](https://github.com/tamang29)! - Operators can enable the mobile app origins for the server CORS allowlist through the Docker deployment configuration.

## 4.5.0

### Patch Changes

- [#701](https://github.com/ls1intum/Apollon/pull/701) Thanks [@tamang29](https://github.com/tamang29)! - `CORS_ORIGIN` now accepts a comma-separated allowlist, so you can permit the mobile app origins (`capacitor://localhost`, `ionic://localhost`) alongside the web app without loosening CORS to a wildcard. Operators: add the mobile origins to `CORS_ORIGIN` when shipping the apps.

- [#689](https://github.com/ls1intum/Apollon/pull/689) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - The Redis Stack container now persists to the `/data` volume (`--dir /data`). It previously defaulted to `/var/lib/redis-stack` — the container's ephemeral layer — so diagrams written between deploys could be silently lost. Operators: redeploy the database so it picks up the corrected data directory.

- Updated dependencies:
  - @tumaet/apollon@5.1.0

## 4.4.1

No server-side changes; released alongside [`@tumaet/webapp@4.4.1`](../webapp/CHANGELOG.md#441).

## 4.4.0

### Major Changes

- [#657](https://github.com/ls1intum/Apollon/pull/657) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Migrates diagram storage from Redis `STRING` keys to RedisJSON on Redis Stack 7.4, with a sibling `:meta` HASH per diagram. API routes move from `/api/<id>` to `/api/diagrams/<id>`. `OWNER_SECRET` (≥ 32 chars) is now required. Deployment runbook in the [GitHub Release](https://github.com/ls1intum/Apollon/releases/tag/v4.4.0).

### Minor Changes

- [#657](https://github.com/ls1intum/Apollon/pull/657) Thanks [@FelixTJDietrich](https://github.com/FelixTJDietrich)! - Versioning API at `/api/diagrams/<id>/versions` and atomic Lua functions (`commit_snapshot`, `restore_version`, `evict_with_priority`) loaded at boot. 30-minute server-side auto-snapshots; typed WebSocket control envelope for cross-tab version events.
