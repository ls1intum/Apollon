/**
 * One-shot migration: convert any pre-existing `diagram:{<id>}` STRING keys
 * (legacy SET <json> EX storage) into RedisJSON. Idempotent — running it
 * twice is a no-op. Refuses to leave any STRING-typed `diagram:*` keys behind.
 *
 * Run via: npm run migrate:string-to-json --workspace=@tumaet/server
 */
import "../loadEnvironment"
import { loadConfig } from "../config"
import { createRedisClient } from "../redis"
import { logger } from "../logger"

async function main() {
  const config = loadConfig()
  const redis = createRedisClient(config.REDIS_URL)
  await redis.connect()

  let scanned = 0
  let migrated = 0
  let alreadyJson = 0
  let skippedOther = 0

  // Match only the canonical HEAD pattern (curly-braced or legacy unbraced).
  const patterns = ["diagram:*"]
  for (const pattern of patterns) {
    for await (const keys of redis.scanIterator({
      MATCH: pattern,
      COUNT: 200,
    })) {
      const arr = Array.isArray(keys) ? keys : [keys]
      for (const key of arr as string[]) {
        scanned++
        // Skip non-HEAD keys (meta/versions/version:* don't match by accident
        // since they include extra segments after `:`).
        if (
          key.includes(":version:") ||
          key.endsWith(":meta") ||
          key.endsWith(":versions")
        ) {
          skippedOther++
          continue
        }
        const type = await redis.type(key)
        if (type === "ReJSON-RL") {
          alreadyJson++
          continue
        }
        if (type !== "string") {
          skippedOther++
          continue
        }
        const ttl = await redis.ttl(key)
        const raw = await redis.get(key)
        if (!raw) continue
        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          logger.warn({ key }, "skipped non-JSON STRING")
          skippedOther++
          continue
        }
        // Atomic JSON.SET + EXPIRE via EVAL so an interrupted run can never
        // leave a JSON-typed HEAD without TTL. Idempotent — the outer loop
        // already filters keys whose TYPE is already ReJSON-RL.
        await redis.eval(
          `redis.call('JSON.SET', KEYS[1], '$', ARGV[1])
           if tonumber(ARGV[2]) > 0 then
             redis.call('EXPIRE', KEYS[1], ARGV[2])
           end
           return 1`,
          {
            keys: [key],
            arguments: [JSON.stringify(parsed), String(ttl > 0 ? ttl : 0)],
          }
        )
        migrated++
      }
    }
  }

  logger.info(
    { scanned, migrated, alreadyJson, skippedOther },
    "migration complete"
  )

  // Final assertion: no STRING-typed diagram:* HEAD keys remain.
  for await (const keys of redis.scanIterator({
    MATCH: "diagram:*",
    COUNT: 200,
  })) {
    const arr = Array.isArray(keys) ? keys : [keys]
    for (const key of arr as string[]) {
      if (
        key.includes(":version:") ||
        key.endsWith(":meta") ||
        key.endsWith(":versions")
      ) {
        continue
      }
      const type = await redis.type(key)
      if (type === "string") {
        await redis.quit()
        throw new Error(
          `Migration incomplete: ${key} still has type 'string'. Aborting.`
        )
      }
    }
  }

  await redis.quit()
}

main().catch((err) => {
  logger.error({ err }, "migration failed")
  process.exit(1)
})
