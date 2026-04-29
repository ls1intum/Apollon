import cors from "cors"
import type { Config } from "../../config"

export function configureCors(config: Config) {
  return cors({
    // Behind the production reverse proxy, API and webapp share the same origin so
    // CORS is a no-op. Allow all origins if CORS_ORIGIN is not set.
    origin: config.CORS_ORIGIN ? [config.CORS_ORIGIN] : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "If-Match", "If-None-Match"],
    exposedHeaders: ["x-owner-match", "x-request-id", "etag"],
  })
}
