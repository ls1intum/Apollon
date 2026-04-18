import cors from "cors"

export function configureCors() {
  const corsOrigin = process.env.CORS_ORIGIN

  return cors({
    // Behind the production reverse proxy, API and webapp share the same origin so
    // CORS is a no-op. Allow all origins if CORS_ORIGIN is not set.
    origin: corsOrigin ? [corsOrigin] : true,
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type"],
  })
}
