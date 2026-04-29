// Load environment first so config picks up .env values.
import "./loadEnvironment"
import { loadConfig } from "./config"
import { logger } from "./logger"
import { buildApp } from "./http/app"
import { bootLoadFunction, createRedisClient } from "./redis"
import { startRelayServer } from "./ws"

async function main() {
  const config = loadConfig()

  const redis = createRedisClient(config.REDIS_URL)
  redis
    .connect()
    .then(async () => {
      logger.info({ event: "redis.connected" }, "redis connected")
      try {
        await bootLoadFunction(redis)
      } catch (err) {
        logger.error(
          { err },
          "redis function load failed — versioning will not work"
        )
      }
    })
    .catch((err) => {
      logger.warn({ err }, "redis connection failed; running without DB")
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
