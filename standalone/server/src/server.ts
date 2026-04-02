// First load environment variables from .env file
import "./loadEnvironment"
import express from "express"
import { configureMiddlewares } from "./middlewares"
import diagramRouter from "./diagramRouter"
import { startSocketServer } from "./relaySocketServer"
import { connectToRedis, redis } from "./database/connect"
import { log } from "./logger"

const PORT = process.env.PORT || 8000
const serverHost = process.env.HOST || "localhost"
const app = express()

// Configure middlewares
configureMiddlewares(app)

// Health endpoint
app.get("/health", async (_req, res) => {
  try {
    await redis.ping()
    res.status(200).json({ status: "ok" })
  } catch {
    res.status(503).json({ status: "error" })
  }
})

// Mount routes
app.use("/api", diagramRouter)

// Start servers immediately for a fast dev feedback loop
app.listen(PORT, () => {
  log.debug(`HTTP server running on http://${serverHost}:${PORT}`)
})
startSocketServer()

// Connect to Redis in background; log status but don't block server startup
connectToRedis()
  .then(() => {
    log.debug("Database connected")
  })
  .catch((err) => {
    log.warn(
      "Database not connected. Continuing without DB:",
      (err as Error)?.message || err
    )
  })
