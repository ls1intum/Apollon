/**
 * Logical copy of the Apollon database from one Redis-protocol server to
 * another (Redis Stack -> Valkey with valkey-json), then a verification pass.
 *
 * Why not copy the data directory: RDB/AOF files written by Redis Stack
 * contain RedisJSON module data that another server may refuse to load, and
 * the on-disk formats are not a compatibility contract. This tool reads every
 * key through the wire protocol, type-aware, and writes it to the target:
 *
 *   ReJSON-RL  JSON.GET <key> .   ->  JSON.SET <key> $ <text>
 *   string     GET                ->  SET
 *   hash       HGETALL            ->  HSET
 *   zset       ZRANGE 0 -1 WITHSCORES -> ZADD
 *
 * The remaining TTL is carried over with PTTL -> PEXPIRE. Any other key type
 * aborts the run before anything is written. The Lua function library is NOT
 * copied; the server loads it itself at boot (`bootLoadFunction`).
 *
 * Safety:
 *   - Refuses to write into a non-empty target unless
 *     --allow-non-empty-target is given (existing keys with the same name are
 *     then overwritten; extra keys in the target are left alone).
 *   - Refuses to run when source and target are the same server and database.
 *   - Never prints document contents, key names or connection secrets. Keys
 *     are only reported as a short hash; URLs as host:port/db.
 *   - Stop the Apollon server first: the copy is not a consistent snapshot of
 *     a database that is still being written.
 *
 * Run (source and target are redis:// URLs, passwords stay in the env):
 *
 *   SOURCE_REDIS_URL=redis://old:6379 TARGET_REDIS_URL=redis://new:6379 \
 *     pnpm --filter @tumaet/server run db:copy [flags]
 *
 * Flags:
 *   --dry-run                 inspect source and target, write nothing
 *   --verify-only             compare source and target, write nothing
 *   --no-verify               skip the verification pass after copying
 *   --allow-non-empty-target  copy even if the target already has keys
 *   --ttl-tolerance-ms=N      allowed TTL difference in verification (2000)
 *
 * Exit code: 0 ok, 1 verification mismatch, 2 refused / failed.
 */
import { createHash } from "node:crypto"
import { pathToFileURL } from "node:url"
import { createClient, RESP_TYPES } from "redis"
import { logger } from "../logger.js"

// ---------------------------------------------------------------------------
// Connection helpers. Bulk strings come back as Buffers so values are copied
// byte for byte, independent of text encoding.
// ---------------------------------------------------------------------------

export function connect(url: string) {
  const client = createClient({ url, RESP: 2 })
  client.on("error", (err) =>
    logger.error({ err: String(err) }, "redis client error")
  )
  return client
}
export type Conn = ReturnType<typeof connect>

const binaryViews = new WeakMap<Conn, ReturnType<typeof binary>>()
function binary(c: Conn) {
  return c.withTypeMapping({ [RESP_TYPES.BLOB_STRING]: Buffer })
}
/** A view of the connection that returns bulk strings as Buffers. */
function bin(c: Conn) {
  let view = binaryViews.get(c)
  if (!view) {
    view = binary(c)
    binaryViews.set(c, view)
  }
  return view
}

type Arg = string | number | Buffer

function cmd(c: Conn, args: Arg[]): Promise<unknown> {
  return bin(c).sendCommand(
    args.map((a) => (typeof a === "number" ? String(a) : a))
  ) as Promise<unknown>
}

const text = (v: unknown): string =>
  Buffer.isBuffer(v) ? v.toString("utf8") : String(v)

/** host:port/db with credentials stripped. */
export function describeEndpoint(url: string): string {
  const u = new URL(url)
  return `${u.hostname}:${u.port || "6379"}/${u.pathname.replace(/^\//, "") || "0"}`
}

/** Short, stable, non-reversible-looking id for a key (never the key itself). */
export function keyId(key: Buffer): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 10)
}

// ---------------------------------------------------------------------------
// Reading and writing one key
// ---------------------------------------------------------------------------

const SUPPORTED_TYPES = ["string", "hash", "zset", "ReJSON-RL"] as const
type SupportedType = (typeof SUPPORTED_TYPES)[number]
const isSupported = (t: string): t is SupportedType =>
  (SUPPORTED_TYPES as readonly string[]).includes(t)

interface Entry {
  type: SupportedType
  /** Remaining TTL in ms; -1 = no expiry. */
  pttl: number
  /** string / JSON text, or flat [field, value, ...] / [member, score, ...]. */
  value: Buffer | Buffer[]
}

async function* scanKeys(c: Conn): AsyncGenerator<Buffer> {
  let cursor = "0"
  do {
    const reply = (await cmd(c, ["SCAN", cursor, "COUNT", 500])) as [
      Buffer,
      Buffer[],
    ]
    cursor = text(reply[0])
    for (const key of reply[1]) yield key
  } while (cursor !== "0")
}

async function keyType(c: Conn, key: Buffer): Promise<string> {
  return text(await cmd(c, ["TYPE", key]))
}

/** Returns undefined when the key is gone (expired between SCAN and read). */
async function readEntry(
  c: Conn,
  key: Buffer,
  type: SupportedType
): Promise<Entry | undefined> {
  const read: Record<SupportedType, Arg[]> = {
    string: ["GET", key],
    hash: ["HGETALL", key],
    zset: ["ZRANGE", key, 0, -1, "WITHSCORES"],
    "ReJSON-RL": ["JSON.GET", key, "."],
  }
  const value = (await cmd(c, read[type])) as Buffer | Buffer[] | null
  const pttl = Number(await cmd(c, ["PTTL", key]))
  if (value === null || pttl === -2) return undefined
  if (Array.isArray(value) && value.length === 0) return undefined
  return { type, pttl, value }
}

async function writeEntry(c: Conn, key: Buffer, entry: Entry): Promise<void> {
  if (entry.pttl === 0) return
  const multi = bin(c).multi()
  multi.addCommand(["DEL", key])
  if (entry.type === "string") {
    multi.addCommand(["SET", key, entry.value as Buffer])
  } else if (entry.type === "ReJSON-RL") {
    multi.addCommand(["JSON.SET", key, "$", entry.value as Buffer])
  } else {
    const flat = entry.value as Buffer[]
    const chunk = 1000 // fields/members per command, i.e. 2 * 500 items
    for (let i = 0; i < flat.length; i += chunk) {
      const part = flat.slice(i, i + chunk)
      if (entry.type === "hash") {
        multi.addCommand(["HSET", key, ...part])
      } else {
        // flat is [member, score, ...]; ZADD wants [score, member, ...].
        const args: Buffer[] = []
        for (let j = 0; j < part.length; j += 2) {
          args.push(part[j + 1] as Buffer, part[j] as Buffer)
        }
        multi.addCommand(["ZADD", key, ...args])
      }
    }
  }
  if (entry.pttl > 0) multi.addCommand(["PEXPIRE", key, String(entry.pttl)])
  const replies = (await multi.exec()) as unknown[]
  for (const reply of replies) {
    if (reply instanceof Error) throw reply
  }
}

// ---------------------------------------------------------------------------
// Preflight
// ---------------------------------------------------------------------------

/** True when `MODULE LIST` shows ReJSON (Redis Stack) or json (valkey-json). */
async function hasJsonModule(c: Conn): Promise<boolean> {
  const modules = (await cmd(c, ["MODULE", "LIST"])) as unknown[]
  return modules.some((m) => {
    if (!Array.isArray(m)) return false
    const i = m.findIndex((x) => text(x) === "name")
    const name = i >= 0 ? text(m[i + 1]) : ""
    return name === "ReJSON" || name === "json"
  })
}

async function serverIdentity(c: Conn): Promise<string> {
  const info = text(await cmd(c, ["INFO", "server"]))
  return /^run_id:(\S+)/m.exec(info)?.[1] ?? ""
}

async function dbSize(c: Conn): Promise<number> {
  return Number(await cmd(c, ["DBSIZE"]))
}

export interface CopyOptions {
  dryRun?: boolean
  allowNonEmptyTarget?: boolean
}

export interface CopyStats {
  scanned: number
  copied: number
  /** Gone from the source between SCAN and read (expired mid-copy). */
  vanished: number
  /** Keys copied without an expiry (none expected for Apollon data). */
  noTtl: number
  byType: Record<string, number>
}

export class CopyRefusedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CopyRefusedError"
  }
}

export async function copyDatabase(
  source: Conn,
  target: Conn,
  sourceUrl: string,
  targetUrl: string,
  options: CopyOptions = {}
): Promise<CopyStats> {
  if (describeEndpoint(sourceUrl) === describeEndpoint(targetUrl)) {
    throw new CopyRefusedError("source and target are the same endpoint")
  }
  const sourceId = await serverIdentity(source)
  if (
    sourceId !== "" &&
    sourceId === (await serverIdentity(target)) &&
    new URL(sourceUrl).pathname === new URL(targetUrl).pathname
  ) {
    throw new CopyRefusedError("source and target are the same server and db")
  }
  if (!(await hasJsonModule(source))) {
    throw new CopyRefusedError("source has no JSON module (ReJSON or json)")
  }
  if (!(await hasJsonModule(target))) {
    throw new CopyRefusedError(
      "target has no JSON module (ReJSON or json); use valkey/valkey-bundle"
    )
  }
  const targetKeys = await dbSize(target)
  if (targetKeys > 0 && !options.allowNonEmptyTarget) {
    throw new CopyRefusedError(
      `target is not empty (${targetKeys} keys); pass --allow-non-empty-target to overwrite same-named keys`
    )
  }

  // Pre-scan: refuse unsupported key types before anything is written.
  const byType: Record<string, number> = {}
  let total = 0
  for await (const key of scanKeys(source)) {
    const t = await keyType(source, key)
    byType[t] = (byType[t] ?? 0) + 1
    total++
  }
  const unsupported = Object.entries(byType).filter(
    ([t]) => !isSupported(t) && t !== "none"
  )
  if (unsupported.length > 0) {
    throw new CopyRefusedError(
      `unsupported key types in source: ${JSON.stringify(Object.fromEntries(unsupported))}`
    )
  }
  logger.info(
    {
      source: describeEndpoint(sourceUrl),
      target: describeEndpoint(targetUrl),
      keys: total,
      byType,
      targetKeys,
      dryRun: Boolean(options.dryRun),
    },
    "copy plan"
  )

  const stats: CopyStats = {
    scanned: 0,
    copied: 0,
    vanished: 0,
    noTtl: 0,
    byType: {},
  }
  if (options.dryRun) return stats

  for await (const key of scanKeys(source)) {
    stats.scanned++
    const type = await keyType(source, key)
    if (!isSupported(type)) {
      stats.vanished++ // "none": expired since the pre-scan
      continue
    }
    const entry = await readEntry(source, key, type)
    if (!entry) {
      stats.vanished++
      continue
    }
    await writeEntry(target, key, entry)
    stats.copied++
    stats.byType[type] = (stats.byType[type] ?? 0) + 1
    if (entry.pttl === -1) stats.noTtl++
  }
  return stats
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/** Recursively sorts object keys so equal documents stringify equally. */
export function canonicalJson(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort)
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, x]) => [k, sort(x)])
      )
    }
    return v
  }
  return JSON.stringify(sort(value))
}

function pairs(flat: Buffer[]): Map<string, string> {
  const m = new Map<string, string>()
  for (let i = 0; i < flat.length; i += 2) {
    m.set(
      (flat[i] as Buffer).toString("latin1"),
      (flat[i + 1] as Buffer).toString("latin1")
    )
  }
  return m
}

function sameScore(a: string, b: string): boolean {
  return a === b || Number(a) === Number(b)
}

export interface VerifyOptions {
  ttlToleranceMs?: number
  /** Do not count keys that exist only in the target as mismatches. */
  allowExtraInTarget?: boolean
}

export interface Mismatch {
  key: string // keyId, never the key itself
  kind:
    | "missing-in-target"
    | "extra-in-target"
    | "type"
    | "value"
    | "ttl"
    | "json"
}

export interface VerifyResult {
  sourceKeys: number
  compared: number
  byteIdenticalJson: number
  canonicalJsonEqual: number
  maxTtlDriftMs: number
  /** Gone from the source or expired during verification. */
  vanished: number
  extraInTarget: number
  mismatches: Mismatch[]
}

export async function verifyDatabase(
  source: Conn,
  target: Conn,
  options: VerifyOptions = {}
): Promise<VerifyResult> {
  const tolerance = options.ttlToleranceMs ?? 2000
  const result: VerifyResult = {
    sourceKeys: 0,
    compared: 0,
    byteIdenticalJson: 0,
    canonicalJsonEqual: 0,
    maxTtlDriftMs: 0,
    vanished: 0,
    extraInTarget: 0,
    mismatches: [],
  }
  const bad = (key: Buffer, kind: Mismatch["kind"]) =>
    result.mismatches.push({ key: keyId(key), kind })

  const seen = new Set<string>()
  for await (const key of scanKeys(source)) {
    result.sourceKeys++
    seen.add(key.toString("latin1"))
    const type = await keyType(source, key)
    if (!isSupported(type)) {
      result.vanished++
      continue
    }
    const src = await readEntry(source, key, type)
    if (!src) {
      result.vanished++
      continue
    }
    const targetType = await keyType(target, key)
    if (targetType === "none") {
      // Legitimate only if the key was about to expire anyway.
      if (src.pttl > 0 && src.pttl <= tolerance) result.vanished++
      else bad(key, "missing-in-target")
      continue
    }
    if (targetType !== type) {
      bad(key, "type")
      continue
    }
    const dst = await readEntry(target, key, type)
    if (!dst) {
      result.vanished++
      continue
    }
    result.compared++

    if (type === "string") {
      if (!(src.value as Buffer).equals(dst.value as Buffer)) bad(key, "value")
    } else if (type === "hash") {
      const a = pairs(src.value as Buffer[])
      const b = pairs(dst.value as Buffer[])
      const equal =
        a.size === b.size && [...a].every(([f, v]) => b.get(f) === v)
      if (!equal) bad(key, "value")
    } else if (type === "zset") {
      const a = pairs(src.value as Buffer[])
      const b = pairs(dst.value as Buffer[])
      const equal =
        a.size === b.size &&
        [...a].every(([m, s]) => b.has(m) && sameScore(s, b.get(m) as string))
      if (!equal) bad(key, "value")
    } else {
      const a = src.value as Buffer
      const b = dst.value as Buffer
      let sameDoc: boolean
      try {
        sameDoc =
          canonicalJson(JSON.parse(a.toString("utf8"))) ===
          canonicalJson(JSON.parse(b.toString("utf8")))
      } catch {
        sameDoc = false
      }
      if (!sameDoc) bad(key, "json")
      else {
        result.canonicalJsonEqual++
        if (a.equals(b)) result.byteIdenticalJson++
      }
    }

    // TTL: both persistent, or both expiring within tolerance of each other.
    if ((src.pttl === -1) !== (dst.pttl === -1)) {
      bad(key, "ttl")
    } else if (src.pttl > 0) {
      const drift = Math.abs(src.pttl - dst.pttl)
      result.maxTtlDriftMs = Math.max(result.maxTtlDriftMs, drift)
      if (drift > tolerance) bad(key, "ttl")
    }
  }

  for await (const key of scanKeys(target)) {
    if (seen.has(key.toString("latin1"))) continue
    result.extraInTarget++
    if (!options.allowExtraInTarget) bad(key, "extra-in-target")
  }
  return result
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main(argv: string[]): Promise<number> {
  const flags = new Set(argv.filter((a) => !a.includes("=")))
  const tolArg = argv.find((a) => a.startsWith("--ttl-tolerance-ms="))
  const ttlToleranceMs = tolArg ? Number(tolArg.split("=")[1]) : 2000
  const known = new Set([
    "--dry-run",
    "--verify-only",
    "--no-verify",
    "--allow-non-empty-target",
  ])
  for (const a of argv) {
    if (!known.has(a) && !a.startsWith("--ttl-tolerance-ms=")) {
      logger.error({ flag: a }, "unknown flag")
      return 2
    }
  }
  if (!Number.isFinite(ttlToleranceMs) || ttlToleranceMs < 0) {
    logger.error("invalid --ttl-tolerance-ms")
    return 2
  }
  const sourceUrl = process.env.SOURCE_REDIS_URL
  const targetUrl = process.env.TARGET_REDIS_URL
  if (!sourceUrl || !targetUrl) {
    logger.error("SOURCE_REDIS_URL and TARGET_REDIS_URL are required")
    return 2
  }

  const source = connect(sourceUrl)
  const target = connect(targetUrl)
  try {
    await Promise.all([source.connect(), target.connect()])

    if (!flags.has("--verify-only")) {
      const stats = await copyDatabase(source, target, sourceUrl, targetUrl, {
        dryRun: flags.has("--dry-run"),
        allowNonEmptyTarget: flags.has("--allow-non-empty-target"),
      })
      logger.info(stats, flags.has("--dry-run") ? "dry run done" : "copy done")
      if (flags.has("--dry-run")) return 0
      if (flags.has("--no-verify")) return 0
    }

    const verify = await verifyDatabase(source, target, {
      ttlToleranceMs,
      allowExtraInTarget: flags.has("--allow-non-empty-target"),
    })
    const { mismatches, ...summary } = verify
    logger.info(
      { ...summary, mismatchCount: mismatches.length },
      "verification summary"
    )
    if (mismatches.length > 0) {
      logger.error(
        { mismatches: mismatches.slice(0, 20) },
        "verification FAILED"
      )
      return 1
    }
    logger.info("verification passed")
    return 0
  } catch (err) {
    if (err instanceof CopyRefusedError) {
      logger.error({ reason: err.message }, "refused")
    } else {
      logger.error({ err: String(err) }, "copy failed")
    }
    return 2
  } finally {
    await Promise.allSettled([source.quit(), target.quit()])
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2)).then((code) => process.exit(code))
}
