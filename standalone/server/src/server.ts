// Load environment first so config picks up .env values.
import "./env.js"
import { loadConfig } from "./config.js"
import { logger } from "./logger.js"
import { buildApp } from "./http/app.js"
import { bootLoadFunction, createRedisClient } from "./redis.js"
import { startRelayServer } from "./ws.js"

async function main() {
  const config = loadConfig()

  // Connect Redis and load the apollon Lua library before accepting
  // traffic. Failure here exits non-zero so the supervisor restarts us;
  // a half-initialised server would race FCALLs against the load and
  // surface "Function not found" to clients.
  const redis = createRedisClient(config.REDIS_URL)
  await redis.connect()
  logger.info({ event: "redis.connected" }, "redis connected")
  await bootLoadFunction(redis)

  // If Redis disconnects and reconnects (restart, failover) the function
  // library has to be re-loaded — Redis Functions are persisted to AOF/RDB,
  // but only on a Redis whose persistence is healthy. Re-loading is
  // idempotent (`FUNCTION LOAD REPLACE`), so it's safe to fire on every
  // ready event.
  redis.on("ready", () => {
    bootLoadFunction(redis).catch((err) =>
      logger.error({ err }, "function library re-load on reconnect failed")
    )
  })

  const relay = startRelayServer({
    port: config.WS_PORT,
    host: config.HOST,
  })

  const app = buildApp({ config, redis, relay })
  const httpServer = app.listen(config.PORT, config.HOST, () => {
    logger.info(
      { event: "http.listen", host: config.HOST, port: config.PORT },
      "http server listening"
    )
  })

  // Graceful shutdown:
  //   1. Stop accepting new HTTP connections (server.close), wait for
  //      in-flight requests to drain. Critical for k8s rolling deploys —
  //      without this, in-flight responses are torn off mid-stream.
  //   2. Close the WebSocket relay (closes peer sockets cleanly).
  //   3. Quit Redis last so any final logging that hits Redis still works.
  const shutdown = async (signal: string) => {
    logger.info({ event: "shutdown.begin", signal }, "shutdown")
    try {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()))
      })
    } catch (err) {
      logger.error({ err }, "http server close failed")
    }
    try {
      await relay.close()
    } catch (err) {
      logger.error({ err }, "ws close failed")
    }
    try {
      await redis.quit()
    } catch (err) {
      logger.error({ err }, "redis quit failed")
    }
    logger.info({ event: "shutdown.complete" })
    process.exit(0)
  }
  process.on("SIGINT", () => void shutdown("SIGINT"))
  process.on("SIGTERM", () => void shutdown("SIGTERM"))
}

main().catch((err) => {
  logger.error({ err }, "fatal startup error")
  process.exit(1)
})
