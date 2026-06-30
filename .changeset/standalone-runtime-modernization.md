---
"@tumaet/server": patch
"@tumaet/webapp": patch
---

Modernize the standalone runtimes, behavior-preserving.

**Server:** migrate Express 5 → Hono 4 + `@hono/node-server` (both zero-runtime-dependency), dropping `express`/`cors`/`cookie`/`pino-http` and ~18 transitives. Routes, status codes, response bodies/headers, the owner-cookie HMAC, CORS policy, the zod error envelopes and the yjs collaboration WebSocket relay are all preserved. Runtime majors bumped: zod 4, redis 6 (RESP2-pinned to keep raw reply shapes), pino 10, ulid 3, and `dotenv` replaced by Node's built-in `util.parseEnv`.

**Webapp:** replace `@ionic/react` (imported only for `isPlatform()` UA checks) with a 45-line vendored `platform.ts`, cutting the Stencil runtime from the initial bundle (~−47% initial gzip) and de-duplicating the editor; `uuid` → native `crypto.randomUUID`.
