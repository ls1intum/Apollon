/**
 * One-shot migration: convert pre-existing `diagram:<id>` STRING keys
 * (legacy SET/GET storage) into the new schema:
 *
 *   diagram:{<id>}        — RedisJSON HEAD (hash-tagged for cluster slotting)
 *   diagram:{<id>}:meta   — HASH with headRev=0, versionSeq=0
 *
 * Idempotent — running it twice is a no-op. Refuses to leave any
 * STRING-typed `diagram:*` HEAD keys behind.
 *
 * Run via: pnpm --filter @tumaet/server run migrate:string-to-json
 */
import "../env.js"
import { loadConfig } from "../config.js"
import { createRedisClient, k } from "../redis.js"
import { logger } from "../logger.js"

const LEGACY_HEAD_RE = /^diagram:(?!\{)(.+)$/

function isNonHeadKey(key: string): boolean {
  return (
    key.includes(":version:") ||
    key.endsWith(":meta") ||
    key.endsWith(":versions") ||
    key.endsWith(":auto-version-marker")
  )
}

async function main() {
  const config = loadConfig()
  const redis = createRedisClient(config.REDIS_URL)
  await redis.connect()

  let scanned = 0
  let migrated = 0
  let alreadyJson = 0
  let skippedOther = 0

  for await (const keys of redis.scanIterator({
    MATCH: "diagram:*",
    COUNT: 200,
  })) {
    const arr = Array.isArray(keys) ? keys : [keys]
    for (const key of arr as string[]) {
      scanned++
      if (isNonHeadKey(key)) {
        skippedOther++
        continue
      }

      // Already in new format — `diagram:{<id>}` with ReJSON type.
      const type = await redis.type(key)
      if (type === "ReJSON-RL") {
        alreadyJson++
        continue
      }
      if (type !== "string") {
        skippedOther++
        continue
      }

      // Extract the diagram ID from the legacy key.
      const match = LEGACY_HEAD_RE.exec(key)
      if (!match) {
        logger.warn({ key }, "skipped key — could not extract diagram ID")
        skippedOther++
        continue
      }
      const diagramId = match[1]!
      const newHeadKey = k.diagram(diagramId)
      const newMetaKey = k.diagramMeta(diagramId)

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

      // Atomic: write new ReJSON HEAD + meta hash + TTLs + delete old key.
      // Safe to re-run: if newHeadKey already exists as ReJSON, the outer
      // loop would have hit the `alreadyJson` branch. If it somehow
      // exists as a STRING (partial prior run), this overwrites it cleanly.
      const ttlStr = String(ttl > 0 ? ttl : config.DIAGRAM_TTL_SECONDS)
      await redis.eval(
        `redis.call('JSON.SET', KEYS[2], '$', ARGV[1])
         redis.call('EXPIRE', KEYS[2], ARGV[2])
         redis.call('HSETNX', KEYS[3], 'headRev', '0')
         redis.call('HSETNX', KEYS[3], 'versionSeq', '0')
         redis.call('EXPIRE', KEYS[3], ARGV[2])
         redis.call('DEL', KEYS[1])
         return 1`,
        {
          keys: [key, newHeadKey, newMetaKey],
          arguments: [JSON.stringify(parsed), ttlStr],
        }
      )

      logger.info(
        { from: key, to: newHeadKey, ttl: Number(ttlStr) },
        "migrated diagram"
      )
      migrated++
    }
  }

  logger.info(
    { scanned, migrated, alreadyJson, skippedOther },
    "migration complete"
  )

  // Final assertion: no STRING-typed diagram HEAD keys remain (legacy or new format).
  for await (const keys of redis.scanIterator({
    MATCH: "diagram:*",
    COUNT: 200,
  })) {
    const arr = Array.isArray(keys) ? keys : [keys]
    for (const key of arr as string[]) {
      if (isNonHeadKey(key)) continue
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
  logger.info("migration verified — no STRING HEAD keys remain")
}

main().catch((err) => {
  logger.error({ err }, "migration failed")
  process.exit(1)
})
