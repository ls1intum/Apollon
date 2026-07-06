import { cors } from "hono/cors"
import type { Config } from "../../config.js"

export function configureCors(config: Config) {
  // Behind the production reverse proxy the browser webapp and API share an
  // origin, so CORS is mostly a no-op there. Capacitor shells use origins such
  // as capacitor://localhost, so deployments that ship mobile apps must add
  // those origins to CORS_ORIGIN. We never reflect arbitrary origins — combined
  // with `credentials: true` that's the OWASP "credentials with wildcard"
  // anti-pattern, which neutralises CORS for any cookied request.
  //
  // hono/cors resolves an array `origin` exactly like the previous `cors`
  // package: it reflects the request Origin only when it is in the list, and
  // omits Access-Control-Allow-Origin otherwise (never `*` under credentials).
  const allowedOrigins = config.CORS_ORIGIN
    ? config.CORS_ORIGIN.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : []
  return cors({
    origin: allowedOrigins,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowHeaders: ["Content-Type", "If-Match", "If-None-Match"],
    exposeHeaders: ["x-owner-match", "x-request-id", "etag"],
  })
}
