import { Hono } from "hono"
import { randomBytes } from "node:crypto"
import type { Config } from "../config.js"
import type { AppEnv } from "../http/env.js"
import { k, type Redis } from "../redis.js"
import type { Diagram } from "../types.js"
import type { RelayHook } from "../http/app.js"
import { Errors } from "../http/errors.js"
import { validate } from "../http/middleware/validate.js"
import { setOwnerCookie } from "../http/middleware/owner.js"
import { logger } from "../logger.js"
import { tryAutoVersion } from "../services/autoVersion.js"
import { DiagramBody, DiagramIdParams, PutDiagramBody } from "./_schemas.js"

interface Deps {
  config: Config
  redis: Redis
}

// ---------------------------------------------------------------------------
// HEAD persistence — exported for the version routes' restore + snapshot
// flows.
// ---------------------------------------------------------------------------

/** Returns the current HEAD diagram or null if missing. */
export async function readDiagram(
  redis: Redis,
  id: string
): Promise<Diagram | null> {
  const result = (await redis.json.get(k.diagram(id), { path: "$" })) as
    | Diagram[]
    | null
  if (!result || !Array.isArray(result) || result.length === 0) return null
  return (result[0] as Diagram | undefined) ?? null
}

/**
 * How long a refreshed TTL must decay before a read is allowed to bump it
 * again. Without this throttle a high-traffic embed (Camo re-fetching the SVG)
 * would issue an EXPIRE on every fetch; with it, an actively-read diagram is
 * refreshed at most once per window — one extra Redis write per day, not per
 * request.
 */
const TTL_REFRESH_THROTTLE_SECONDS = 24 * 3600

/**
 * Sliding expiry: a read pushes the diagram's 120-day TTL back to full so a
 * diagram that's still being opened or embedded doesn't expire out from under a
 * README/issue while it's unedited.
 *
 * Best-effort and throttled: it refreshes only once the remaining TTL has
 * dropped below `full - throttle`, and any failure is swallowed so it can never
 * break the read it rode in on. Pass `knownTtlSeconds` when the caller already
 * has the TTL (e.g. folded into the embed read's MULTI) to avoid an extra round
 * trip. A `-1` (no expiry) / `-2` (missing) TTL is left untouched.
 */
export async function refreshDiagramTtl(
  redis: Redis,
  fullTtlSeconds: number,
  id: string,
  knownTtlSeconds?: number
): Promise<void> {
  try {
    const ttl = knownTtlSeconds ?? (await redis.ttl(k.diagram(id)))
    if (ttl < 0 || ttl >= fullTtlSeconds - TTL_REFRESH_THROTTLE_SECONDS) return
    const multi = redis.multi()
    multi.expire(k.diagram(id), fullTtlSeconds)
    multi.expire(k.diagramMeta(id), fullTtlSeconds)
    await multi.exec()
  } catch (err) {
    logger.warn({ err, diagramId: id }, "diagram TTL refresh failed")
  }
}

/** Atomically writes HEAD, bumps headRev, updates updatedAt, and bumps TTLs. */
export async function saveHead(
  redis: Redis,
  config: Config,
  diagram: Diagram
): Promise<{ headRev: number; updatedAt: string }> {
  const updatedAt = new Date().toISOString()
  const persisted = { ...diagram, updatedAt }
  const ttl = config.DIAGRAM_TTL_SECONDS
  const head = k.diagram(diagram.id)
  const meta = k.diagramMeta(diagram.id)

  // Diagram is a plain JSON object (no class instances, no Date values, no
  // undefined fields after spread) so node-redis's JSON.SET accepts it as
  // RedisJSON-compatible. The structural type check is loose at the boundary;
  // the runtime shape is exactly what server validation produced upstream.
  const multi = redis.multi()
  multi.json.set(head, "$", persisted as never)
  multi.expire(head, ttl)
  multi.hSet(meta, {
    title: diagram.title,
    type: diagram.type,
    updatedAt,
    librarySchemaVersion: diagram.version,
  })
  multi.hIncrBy(meta, "headRev", 1)
  multi.expire(meta, ttl)
  const replies = (await multi.exec()) as unknown[]
  // node-redis surfaces command errors as Error values in the reply array
  // rather than throwing — surface them so torn writes don't pass silently.
  for (const reply of replies) {
    if (reply instanceof Error) throw reply
  }
  const headRev = Number(replies[3] ?? 0)
  if (!Number.isFinite(headRev)) {
    throw new Error(
      `saveHead: hIncrBy returned non-numeric reply: ${String(replies[3])}`
    )
  }
  return { headRev, updatedAt }
}

/** Cascade-deletes the diagram and its entire version family. */
export async function cascadeDeleteDiagram(
  redis: Redis,
  id: string
): Promise<number> {
  let deleted = 0
  const pattern = `diagram:{${id}}*`
  for await (const keys of redis.scanIterator({
    MATCH: pattern,
    COUNT: 200,
  })) {
    if (keys.length > 0) {
      deleted += (await redis.del(keys)) ?? 0
    }
  }
  return deleted
}

function generateDiagramId(): string {
  return randomBytes(16)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function mountDiagramRoutes(
  { config, redis }: Deps,
  relay?: RelayHook
): Hono<AppEnv> {
  const router = new Hono<AppEnv>()

  router.post(
    "/diagrams",
    validate(
      { body: DiagramBody.omit({ id: true }).partial() },
      async (c, { body }) => {
        const id = generateDiagramId()
        const now = new Date().toISOString()
        const diagram: Diagram = {
          id,
          version: body.version ?? "4.0.0",
          title: body.title ?? "",
          type: (body.type as Diagram["type"]) ?? "ClassDiagram",
          nodes: (body.nodes ?? []) as Diagram["nodes"],
          edges: (body.edges ?? []) as Diagram["edges"],
          assessments: (body.assessments ?? {}) as Diagram["assessments"],
          createdAt: now,
          updatedAt: now,
        }
        await saveHead(redis, config, diagram)
        setOwnerCookie(c, id, config.OWNER_SECRET)
        return c.json(diagram, 201)
      }
    )
  )

  router.get(
    "/diagrams/:diagramId",
    validate({ params: DiagramIdParams }, async (c, { params }) => {
      const diagram = await readDiagram(redis, params.diagramId)
      if (!diagram) throw Errors.notFound("diagram not found")
      // Opening a diagram counts as activity — slide its TTL forward.
      await refreshDiagramTtl(
        redis,
        config.DIAGRAM_TTL_SECONDS,
        params.diagramId
      )
      return c.json(diagram, 200)
    })
  )

  router.put(
    "/diagrams/:diagramId",
    validate(
      { params: DiagramIdParams, body: PutDiagramBody },
      async (c, { params, body }) => {
        const existing = await readDiagram(redis, params.diagramId)

        // If-Match advisory race detection. Optional; the client drives the
        // retry loop. LWW remains the documented contract — this header
        // exists only to give clients a chance to refetch + rebase.
        const ifMatch = c.req.header("if-match")
        if (ifMatch && existing) {
          const headRevStr = await redis.hGet(
            k.diagramMeta(params.diagramId),
            "headRev"
          )
          const currentHeadRev = headRevStr ? Number(headRevStr) : 0
          const sent = Number(ifMatch.replace(/^"|"$/g, ""))
          if (Number.isFinite(sent) && sent !== currentHeadRev) {
            throw Errors.revisionMismatch(currentHeadRev)
          }
        }

        const merged: Diagram = {
          id: params.diagramId,
          version: body.version,
          title: body.title,
          type: body.type as Diagram["type"],
          nodes: body.nodes as Diagram["nodes"],
          edges: body.edges as Diagram["edges"],
          assessments: body.assessments as Diagram["assessments"],
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        const { headRev, updatedAt } = await saveHead(redis, config, merged)

        // Issue the owner cookie on first PUT for diagrams created before
        // the soft-cookie feature shipped (back-compat).
        if (!c.get("isOwner")) {
          setOwnerCookie(c, params.diagramId, config.OWNER_SECRET)
        }

        // Fire-and-forget auto-version. The HEAD response is what the client
        // is waiting on; auto-versioning is bookkeeping that shouldn't block
        // the autosave hot path. Errors are logged inside tryAutoVersion so
        // any failure is observable without surfacing to the user (the most
        // recent HEAD already persisted).
        void tryAutoVersion(
          { config, redis, relay },
          params.diagramId,
          merged
        ).catch((err) => {
          logger.error(
            { err, diagramId: params.diagramId, event: "version.auto.failed" },
            "auto-version failed"
          )
        })

        c.header("etag", `"${headRev}"`)
        return c.json({ headRev, updatedAt }, 200)
      }
    )
  )

  router.delete(
    "/diagrams/:diagramId",
    validate({ params: DiagramIdParams }, async (c, { params }) => {
      const deleted = await cascadeDeleteDiagram(redis, params.diagramId)
      relay?.publishControl(params.diagramId, { type: "DIAGRAM_DELETED" })
      logger.info(
        {
          event: "diagram.deleted",
          diagramId: params.diagramId,
          deletedKeys: deleted,
        },
        "diagram deleted"
      )
      return c.body(null, 204)
    })
  )

  return router
}
