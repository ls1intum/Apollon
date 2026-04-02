import { createClient } from "redis"
import { log } from "../logger"

export const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
})

redis.on("error", (err) => log.error("Redis client error:", err))

export const connectToRedis = async (): Promise<void> => {
  try {
    await redis.connect()
    log.debug("Connected to Redis")
  } catch (error) {
    log.error("Redis connection error:", error as Error)
    throw error
  }
}
