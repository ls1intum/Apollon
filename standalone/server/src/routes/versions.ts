import { Hono } from "hono"
import { z } from "zod"
import { ulid } from "ulid"
import type { Config } from "../config.js"
import type { AppEnv } from "../http/env.js"
import {
  fcall,
  gunzipJson,
  gzipJson,
  k,
  RedisAppError,
  type Redis,
} from "../redis.js"
import type { Diagram, VersionKind, VersionSummary } from "../types.js"
import type { RelayHook } from "../http/app.js"
import { Errors } from "../http/errors.js"
import { validate } from "../http/middleware/validate.js"
import { setOwnerCookie } from "../http/middleware/owner.js"
import { logger } from "../logger.js"
import { readDiagram, saveHead } from "./diagrams.js"
import {
  DiagramBody,
  DiagramIdAndVersionIdParams,
  DiagramIdParams,
  PaginationQuery,
} from "./_schemas.js"

interface Deps {
  config: Config
  redis: Redis
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readVersionMeta(
  redis: Redis,
  diagramId: string,
  versionId: string
): Promise<VersionSummary | null> {
  const meta = await redis.hGetAll(k.versionMeta(diagramId, versionId))
  if (!meta || Object.keys(meta).length === 0) return null
  const parsedSeq = meta.seq ? Number(meta.seq) : NaN
  return {
    id: versionId,
    diagramId,
    name: meta.name ?? "",
    description: meta.description ?? "",
    createdAt: new Date(Number(meta.createdAt ?? 0)).toISOString(),
    kind: ((meta.kind as VersionKind | undefined) ?? "user") as VersionKind,
    librarySchemaVersion: meta.librarySchemaVersion ?? "",
    ...(Number.isFinite(parsedSeq) ? { seq: parsedSeq } : {}),
  }
}

async function readVersionBody(
  redis: Redis,
  diagramId: string,
  versionId: string
): Promise<Diagram | null> {
  const s = await redis.get(k.versionBody(diagramId, versionId))
  if (s === null || s === undefined) return null
  return gunzipJson<Diagram>(s)
}

interface CommitSnapshotInput {
  diagramId: string
  vid: string
  nowMs: number
  ttlSec: number
  maxVersions: number
  name: string
  description: string
  kind: VersionKind
  librarySchemaVersion: string
  body: Diagram
}

async function commitSnapshot(
  redis: Redis,
  input: CommitSnapshotInput
): Promise<{
  vid: string
  evictedIds: string[]
  evictedKinds: ("unnamed" | "named")[]
  seq: number
}> {
  const gz = gzipJson(input.body)
  // Lua reply shape: [vid, evictedIds[], evictedKinds[], seq]. Indexes
  // are positional; parallel arrays for evictions so the client can
  // word the eviction toast accurately ("autosave was removed" vs
  // "named version was removed").
  const reply = (await fcall(
    redis,
    "commit_snapshot",
    [
      k.diagram(input.diagramId),
      k.versionsIndex(input.diagramId),
      k.diagramMeta(input.diagramId),
    ],
    [
      input.vid,
      String(input.nowMs),
      String(input.ttlSec),
      String(input.maxVersions),
      input.name,
      input.description,
      input.kind,
      input.librarySchemaVersion,
      gz,
    ]
  )) as [string, string[], ("unnamed" | "named")[], string]
  return {
    vid: reply[0],
    evictedIds: reply[1] ?? [],
    evictedKinds: reply[2] ?? [],
    seq: Number(reply[3] ?? 0),
  }
}

interface RestoreVersionInput {
  diagramId: string
  preRestoreBody: Diagram
  fromVersionId: string
  versionTtlSec: number
  headTtlSec: number
  maxVersions: number
  autoSnapshotName: string
}

async function restoreVersion(
  redis: Redis,
  input: RestoreVersionInput
): Promise<{
  autoSnapshotVersionId: string
  headRev: number
  updatedAt: string
  evicted: string[]
}> {
  // Decompress the source version body server-side; Redis Lua has no gunzip.
  // The auto-snapshot body crosses the boundary in its storage form (gzip+
  // base64); the head-apply body crosses as raw JSON for JSON.SET.
  const restored = await readVersionBody(
    redis,
    input.diagramId,
    input.fromVersionId
  )
  if (!restored) throw Errors.notFound("version body missing")

  const autoVid = ulid()
  const nowMs = Date.now()
  const updatedAt = new Date(nowMs).toISOString()
  const headJson = JSON.stringify({ ...restored, updatedAt })
  const autoGz = gzipJson(input.preRestoreBody)

  const reply = (await fcall(
    redis,
    "restore_version",
    [
      k.diagram(input.diagramId),
      k.versionsIndex(input.diagramId),
      k.diagramMeta(input.diagramId),
    ],
    [
      autoVid,
      String(nowMs),
      String(input.versionTtlSec),
      String(input.headTtlSec),
      String(input.maxVersions),
      input.autoSnapshotName,
      input.preRestoreBody.version,
      autoGz,
      input.fromVersionId,
      headJson,
    ]
  )) as [string, string, string[]]

  return {
    autoSnapshotVersionId: reply[0],
    headRev: Number(reply[1]),
    updatedAt,
    evicted: reply[2] ?? [],
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function mountVersionRoutes(
  { config, redis }: Deps,
  relay?: RelayHook
): Hono<AppEnv> {
  const router = new Hono<AppEnv>()

  // GET /diagrams/:diagramId/versions
  router.get(
    "/diagrams/:diagramId/versions",
    validate(
      { params: DiagramIdParams, query: PaginationQuery },
      async (c, { params, query }) => {
        // Resolve the cursor's score so the Lua function can break
        // same-millisecond ties by member-lex. Without this, multiple
        // versions written within one ms would silently disappear on the
        // next page (an exclusive score boundary skips every member at
        // that score).
        let beforeScore = "+inf"
        let beforeMember = ""
        if (query.before) {
          const score = await redis.zScore(
            k.versionsIndex(params.diagramId),
            query.before
          )
          if (score === null || score === undefined) {
            return c.json({ versions: [] }, 200)
          }
          beforeScore = String(score)
          beforeMember = query.before
        }

        const ids = (await fcall(
          redis,
          "list_versions_before",
          [k.versionsIndex(params.diagramId)],
          [beforeScore, beforeMember, String(query.limit)]
        )) as string[]

        const slice = ids.slice(0, query.limit)
        const nextCursor =
          ids.length > query.limit ? slice[slice.length - 1] : undefined

        const summaries = await Promise.all(
          slice.map((id) => readVersionMeta(redis, params.diagramId, id))
        )
        const versions = summaries.filter((s): s is VersionSummary => !!s)
        // Total count across the whole index — lets the client render an
        // accurate "N / cap" header without waiting for every page to load.
        const total = await redis.zCard(k.versionsIndex(params.diagramId))
        return c.json({ versions, nextCursor, total }, 200)
      }
    )
  )

  // POST /diagrams/:diagramId/versions — body inline (server flushes-then-snapshots).
  router.post(
    "/diagrams/:diagramId/versions",
    validate(
      {
        params: DiagramIdParams,
        body: z.object({
          name: z.string().max(config.MAX_NAME_LENGTH).optional(),
          description: z.string().max(config.MAX_DESCRIPTION_LENGTH).optional(),
          actor: z.string().max(100).optional(),
          body: DiagramBody,
        }),
      },
      async (c, { params, body }) => {
        try {
          // Require an existing diagram. Snapshots cannot create HEAD.
          const existing = await readDiagram(redis, params.diagramId)
          if (!existing) throw Errors.noHead()

          const flushed = {
            ...body.body,
            id: params.diagramId,
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString(),
          } as Diagram

          const { headRev } = await saveHead(redis, config, flushed)

          const vid = ulid()
          const nowMs = Date.now()
          const result = await commitSnapshot(redis, {
            diagramId: params.diagramId,
            vid,
            nowMs,
            ttlSec: config.VERSION_TTL_SECONDS,
            maxVersions: config.MAX_VERSIONS_PER_DIAGRAM,
            name: body.name ?? "",
            description: body.description ?? "",
            kind: "user",
            librarySchemaVersion: flushed.version,
            body: flushed,
          })

          if (!c.get("isOwner"))
            setOwnerCookie(c, params.diagramId, config.OWNER_SECRET)

          const summary = await readVersionMeta(redis, params.diagramId, vid)
          if (!summary)
            throw Errors.internal("version meta missing after commit")

          // Post-commit authoritative count so the client doesn't need to
          // derive it (prev + 1 - evicted), which can drift on concurrent
          // saves from multiple collaborators.
          const total = await redis.zCard(k.versionsIndex(params.diagramId))

          relay?.publishControl(params.diagramId, {
            type: "VERSION_CREATED",
            versionId: vid,
            createdAt: summary.createdAt,
            name: summary.name,
            kind: summary.kind,
            ...(body.actor ? { actor: body.actor } : {}),
          })

          logger.info(
            {
              event: "version.created",
              diagramId: params.diagramId,
              versionId: vid,
              kind: "user",
              seq: summary.seq,
              evictedVersionIds: result.evictedIds,
              evictedKinds: result.evictedKinds,
              librarySchemaVersion: flushed.version,
              requestId: c.get("requestId"),
            },
            "version.created"
          )

          // Surface evicted IDs + kinds to the client so it can word the
          // toast accurately. "named" eviction means we hit the cap with
          // `MAX_VERSIONS_PER_DIAGRAM` named rows and dropped the oldest
          // one — that's user data loss that needs a stronger message
          // than "autosave removed".
          return c.json(
            {
              ...summary,
              evictedVersionIds: result.evictedIds,
              evictedKinds: result.evictedKinds,
              total,
              headRev,
            },
            201
          )
        } catch (err) {
          if (err instanceof RedisAppError && err.code === "NO_HEAD") {
            throw Errors.noHead()
          }
          throw err
        }
      }
    )
  )

  // GET /diagrams/:diagramId/versions/:versionId — immutable JSON body.
  // Thumbnails render client-side from this body via the library's
  // `ApollonEditor.exportModelAsSvg`; the previous `?type=svg` branch is
  // gone — booting JSDOM + the full library bundle on the server for a
  // 64×40 thumbnail was the wrong tradeoff (and didn't work in local
  // mode). PDF export is unaffected — it has its own worker path.
  router.get(
    "/diagrams/:diagramId/versions/:versionId",
    validate({ params: DiagramIdAndVersionIdParams }, async (c, { params }) => {
      const body = await readVersionBody(
        redis,
        params.diagramId,
        params.versionId
      )
      if (!body) throw Errors.notFound("version not found")
      c.header("etag", `"${params.versionId}"`)
      c.header("cache-control", "private, max-age=86400, immutable")
      return c.json(body, 200)
    })
  )

  // POST /diagrams/:diagramId/versions/:versionId/restore
  router.post(
    "/diagrams/:diagramId/versions/:versionId/restore",
    validate(
      {
        params: DiagramIdAndVersionIdParams,
        body: z.object({
          currentBody: DiagramBody.optional(),
          actor: z.string().max(100).optional(),
        }),
      },
      async (c, { params, body }) => {
        try {
          // Capture the user's actual canvas as the pre-restore auto-snapshot.
          // currentBody (when sent) reflects what they see; otherwise we fall
          // back to whatever HEAD currently holds.
          let preRestoreBody: Diagram
          if (body.currentBody) {
            const flushed = {
              ...body.currentBody,
              id: params.diagramId,
              createdAt: body.currentBody.createdAt ?? new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as Diagram
            await saveHead(redis, config, flushed)
            preRestoreBody = flushed
          } else {
            const existing = await readDiagram(redis, params.diagramId)
            if (!existing) throw Errors.noHead()
            preRestoreBody = existing
          }

          const fromMeta = await readVersionMeta(
            redis,
            params.diagramId,
            params.versionId
          )
          if (!fromMeta) throw Errors.notFound("version not found")

          // Pre-restore snapshot gets a self-explanatory name so it survives
          // eviction priority (unnamed autos go first; this one is named).
          const autoName = fromMeta.name?.trim()
            ? `Before restoring '${fromMeta.name.trim()}'`
            : fromMeta.seq !== undefined
              ? `Before restoring #${fromMeta.seq}`
              : `Before restoring snapshot ${params.versionId.slice(0, 8)}`

          const result = await restoreVersion(redis, {
            diagramId: params.diagramId,
            preRestoreBody,
            fromVersionId: params.versionId,
            versionTtlSec: config.VERSION_TTL_SECONDS,
            headTtlSec: config.DIAGRAM_TTL_SECONDS,
            maxVersions: config.MAX_VERSIONS_PER_DIAGRAM,
            autoSnapshotName: autoName,
          })

          relay?.publishControl(params.diagramId, {
            type: "VERSION_RESTORED",
            headRev: result.headRev,
            updatedAt: result.updatedAt,
            autoSnapshotVersionId: result.autoSnapshotVersionId,
            restoredFromVersionId: params.versionId,
            ...(body.actor ? { actor: body.actor } : {}),
          })

          logger.info(
            {
              event: "version.restored",
              diagramId: params.diagramId,
              restoredFromVersionId: params.versionId,
              autoSnapshotVersionId: result.autoSnapshotVersionId,
              evictedVersionIds: result.evicted,
              headRev: result.headRev,
              requestId: c.get("requestId"),
            },
            "version.restored"
          )

          return c.json(
            {
              headRev: result.headRev,
              updatedAt: result.updatedAt,
              autoSnapshotVersionId: result.autoSnapshotVersionId,
            },
            200
          )
        } catch (err) {
          if (err instanceof RedisAppError) {
            if (err.code === "NO_HEAD") throw Errors.noHead()
            if (err.code === "NO_VERSION_BODY")
              throw Errors.notFound("version body missing")
          }
          throw err
        }
      }
    )
  )

  // PATCH /diagrams/:diagramId/versions/:versionId — rename / edit description.
  router.patch(
    "/diagrams/:diagramId/versions/:versionId",
    validate(
      {
        params: DiagramIdAndVersionIdParams,
        body: z.object({
          name: z.string().max(config.MAX_NAME_LENGTH).optional(),
          description: z.string().max(config.MAX_DESCRIPTION_LENGTH).optional(),
        }),
      },
      async (c, { params, body }) => {
        const existing = await readVersionMeta(
          redis,
          params.diagramId,
          params.versionId
        )
        if (!existing) throw Errors.notFound("version not found")

        const updates: Record<string, string> = {}
        if (body.name !== undefined) updates.name = body.name
        if (body.description !== undefined)
          updates.description = body.description
        // When the user gives a name to an auto-snapshot (kind !== "user"),
        // promote it so it is treated as a named milestone: shown without
        // collapse, protected from eviction priority, labelled in the UI.
        if (body.name?.trim() && existing.kind !== "user") {
          updates.kind = "user"
        }
        if (Object.keys(updates).length === 0) {
          return c.json(existing, 200)
        }

        await redis.hSet(
          k.versionMeta(params.diagramId, params.versionId),
          updates
        )
        const updated = await readVersionMeta(
          redis,
          params.diagramId,
          params.versionId
        )

        relay?.publishControl(params.diagramId, {
          type: "VERSION_RENAMED",
          versionId: params.versionId,
          name: updated?.name ?? existing.name,
          description: updated?.description ?? existing.description,
        })

        logger.info(
          {
            event: "version.renamed",
            diagramId: params.diagramId,
            versionId: params.versionId,
            requestId: c.get("requestId"),
          },
          "version.renamed"
        )

        return c.json(updated, 200)
      }
    )
  )

  // DELETE /diagrams/:diagramId/versions/:versionId
  router.delete(
    "/diagrams/:diagramId/versions/:versionId",
    validate({ params: DiagramIdAndVersionIdParams }, async (c, { params }) => {
      const existing = await readVersionMeta(
        redis,
        params.diagramId,
        params.versionId
      )
      if (!existing) throw Errors.notFound("version not found")

      const multi = redis.multi()
      multi.del(k.versionBody(params.diagramId, params.versionId))
      multi.del(k.versionMeta(params.diagramId, params.versionId))
      multi.zRem(k.versionsIndex(params.diagramId), params.versionId)
      await multi.exec()

      relay?.publishControl(params.diagramId, {
        type: "VERSION_DELETED",
        versionId: params.versionId,
      })

      logger.info(
        {
          event: "version.deleted",
          diagramId: params.diagramId,
          versionId: params.versionId,
          requestId: c.get("requestId"),
        },
        "version.deleted"
      )
      return c.body(null, 204)
    })
  )

  return router
}
