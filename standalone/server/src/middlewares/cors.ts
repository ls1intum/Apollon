import cors from "cors"

export function configureCors() {
  const frontendUrl = process.env.FRONTEND_URL

  return cors({
    // When served behind a reverse proxy (Caddy), API and webapp share the same
    // origin so CORS is a no-op. Allow all origins if FRONTEND_URL is not set.
    origin: frontendUrl ? [frontendUrl] : true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
}
