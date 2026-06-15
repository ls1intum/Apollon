import cors from "cors"
import type { Config } from "../../config.js"

export function configureCors(config: Config) {
  // Behind the production reverse proxy the browser webapp and API share an
  // origin, so CORS is mostly a no-op there. Capacitor shells use origins such
  // as capacitor://localhost, so deployments that ship mobile apps must add
  // those origins to CORS_ORIGIN. We never reflect arbitrary origins — combined
  // with `credentials: true` that's the OWASP "credentials with wildcard"
  // anti-pattern, which neutralises CORS for any cookied request.
  const allowedOrigins = config.CORS_ORIGIN
    ? config.CORS_ORIGIN.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : []
  return cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "If-Match", "If-None-Match"],
    exposedHeaders: ["x-owner-match", "x-request-id", "etag"],
  })
}
