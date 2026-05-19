import { ulid } from "ulid"
import { fcall, gunzipJson, gzipJson, k, type Redis } from "../redis.js"
import type { Config } from "../config.js"
import type { Diagram } from "../types.js"
import type { RelayHook } from "../http/app.js"
import { logger } from "../logger.js"

/**
 * Wall-clock auto-versioning hook for the HEAD PUT path.
 *
 * Mirrors Figma's behaviour: every `AUTO_VERSION_INTERVAL_SECONDS` (30 min by
 * default) the server commits a snapshot of HEAD as `kind: "auto"` with an
 * empty name+description. The Lua eviction prefers to sweep these unnamed
 * autosaves first, so they cannot displace the user's named milestones.
 *
 * Coordination is via Redis `SET NX EX <interval>` on a per-diagram marker:
 *
 *   - `NX` makes the acquire atomic across concurrent PUTs (multiple
 *     collaborators triggering autosaves in the same window).
 *   - `EX <interval>` is the gap itself; expiry is the next eligibility.
 *
 * If the marker is acquired but HEAD is structurally identical to the latest
 * snapshot (idle session — no real edits since last auto), we keep the
 * marker but skip the commit. The next eligible window is 30 min later, not
 * "next PUT" — there's nothing to checkpoint and we don't want every 5-second
 * autosave PUT to re-diff the same body.
 */

interface AutoVersionDeps {
  config: Config
  redis: Redis
  relay: RelayHook | undefined
}

/**
 * A coarse "anything user-meaningful changed" check for the auto-version
 * trigger. Mirrors the webapp's `structuralFingerprint`
 * (VersionDrawer.tsx → VOLATILE_KEYS) so the server gate doesn't fire on
 * pure UI churn that the client correctly considered idle. The replacer
 * strips React-Flow's transient/layout/capability fields, which Yjs
 * happily round-trips to HEAD when a user merely clicks or drags. Without
 * this, every focus event on a node would flip the fingerprint and burn
 * an auto-version slot. False positives are cheap; false negatives cost
 * a recovery point.
 *
 * Keep the key set in sync with VersionDrawer.tsx — the integration test
 * `versions.int.test.ts > tryAutoVersion skips on selection-only churn`
 * pins this contract.
 */
const VOLATILE_KEYS = new Set([
  "selected",
  "dragging",
  "resizing",
  "hidden",
  "measured",
  "selectable",
  "draggable",
  "connectable",
  "deletable",
])

function structuralFingerprint(d: Diagram): string {
  return JSON.stringify(
    {
      title: d.title,
      type: d.type,
      version: d.version,
      nodes: d.nodes,
      edges: d.edges,
      assessments: d.assessments,
    },
    (key, value) => (VOLATILE_KEYS.has(key) ? undefined : value)
  )
}

export async function tryAutoVersion(
  { config, redis, relay }: AutoVersionDeps,
  diagramId: string,
  head: Diagram
): Promise<void> {
  // Skip empty diagrams entirely. The "user just created the diagram and
  // hasn't drawn anything yet" case otherwise produces a phantom v1 with
  // no content and no name — confusing because the user didn't ask for
  // it and the row is non-deletable (eviction priority hides Delete on
  // unnamed autosaves). Empty checked *before* marker acquisition so we
  // don't burn 30 min of cooldown on a no-op.
  if (head.nodes.length === 0 && head.edges.length === 0) return

  const marker = k.autoVersionMarker(diagramId)
  const acquired = await redis.set(marker, "1", {
    NX: true,
    EX: config.AUTO_VERSION_INTERVAL_SECONDS,
  })
  if (acquired !== "OK") return

  // Once the marker is held, *anything* that throws past this point would
  // strand it for the full 30 min, leaving the diagram un-checkpointed
  // until expiry. Wrap the commit path so the marker is released on any
  // failure — Redis `gunzipJson` parse errors, `fcall` transport errors,
  // relay broadcast issues, etc. The marker stays only on the happy
  // commit path and on the documented idle-skip path (where it represents
  // "nothing to checkpoint right now, try again in 30 min").
  let didCommit = false
  try {
    const latestIds = (await redis.zRange(k.versionsIndex(diagramId), 0, 0, {
      REV: true,
    })) as string[]
    const latestId = latestIds[0]
    if (!latestId) {
      // No prior version exists yet → defer the first checkpoint to the
      // user. Without a baseline, an auto-version here would be a row of
      // its own — no comparison anchor, no recovery context — and would
      // appear in the sidebar as a phantom the user didn't ask for.
      // HEAD itself is autosaved every 5s for crash safety; the cost of
      // waiting for the user's first explicit save is one additional
      // click, the benefit is a version list that only contains rows
      // the user actually triggered. The marker stays for the full
      // 30-min window so we don't burn a Redis call on every 5s PUT.
      didCommit = true
      return
    }
    const raw = await redis.get(k.versionBody(diagramId, latestId))
    if (raw) {
      const latest = gunzipJson<Diagram>(raw)
      if (structuralFingerprint(latest) === structuralFingerprint(head)) {
        // Idle session — nothing to checkpoint. Marker stays so we
        // don't re-evaluate every 5 seconds; next chance is in 30 min.
        didCommit = true
        return
      }
    }

    const vid = ulid()
    const nowMs = Date.now()
    await fcall(
      redis,
      "commit_snapshot",
      [
        k.diagram(diagramId),
        k.versionsIndex(diagramId),
        k.diagramMeta(diagramId),
      ],
      [
        vid,
        String(nowMs),
        String(config.VERSION_TTL_SECONDS),
        String(config.MAX_VERSIONS_PER_DIAGRAM),
        "",
        "",
        "auto",
        head.version,
        gzipJson(head),
      ]
    )
    didCommit = true

    relay?.publishControl(diagramId, {
      type: "VERSION_CREATED",
      versionId: vid,
      createdAt: new Date(nowMs).toISOString(),
      name: "",
      kind: "auto",
    })

    logger.info(
      {
        event: "version.auto.created",
        diagramId,
        versionId: vid,
        librarySchemaVersion: head.version,
      },
      "auto-version committed"
    )
  } finally {
    if (!didCommit) {
      // Release the cooldown so the next eligible PUT can retry. We
      // tolerate a small risk of double-fire under extreme network
      // conditions (e.g. SET-NX races with another writer that sees
      // the released marker) — the structural-fingerprint gate would
      // skip the second commit anyway.
      await redis.del(marker).catch((err) => {
        logger.error(
          { err, diagramId, event: "version.auto.markerCleanupFailed" },
          "failed to release auto-version marker after error"
        )
      })
    }
  }
}
