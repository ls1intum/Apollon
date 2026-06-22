import type { VersionKind } from "@/types"

/**
 * Domain predicates over version metadata. Pure — no UI, no services
 * coupling. Lives outside `components/` and `services/` so the IDB
 * eviction (services) and the drawer (components) can both depend on
 * the same definition without cross-layer imports.
 */

/**
 * True when the version should be treated as a user-intentional milestone:
 * either the user explicitly saved it (`kind === "user"`) or an
 * auto-snapshot was later given a name / description.
 */
export function isNamedVersion(v: {
  kind: VersionKind
  name?: string
  description?: string
}): boolean {
  return v.kind === "user" || Boolean(v.name?.trim() || v.description?.trim())
}

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

/**
 * Structural fingerprint for dirty detection. Mirrors the server's
 * `structuralFingerprint` (`server/services/autoVersion.ts`) — both hash
 * the same six fields with the same VOLATILE_KEYS replacer, pinned by an
 * integration test.
 *
 * The replacer drops UI/transient flags so React-Flow measurement noise
 * doesn't register as a user-meaningful change.
 */
export function structuralFingerprint(model: {
  nodes: unknown
  edges: unknown
  assessments?: unknown
  title?: unknown
  type?: unknown
  version?: unknown
}): string {
  return JSON.stringify(
    {
      nodes: model.nodes,
      edges: model.edges,
      assessments: model.assessments,
      title: model.title,
      type: model.type,
      version: model.version,
    },
    (key, value) => (VOLATILE_KEYS.has(key) ? undefined : value)
  )
}
