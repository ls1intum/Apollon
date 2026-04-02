import cors from "cors"

export function configureCors() {
  const corsOrigin = process.env.CORS_ORIGIN

  return cors({
    // When served behind a reverse proxy (Caddy), API and webapp share the same
    // origin so CORS is a no-op. Allow all origins if CORS_ORIGIN is not set.
    origin: corsOrigin ? [corsOrigin] : true,
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type"],
  })
}
