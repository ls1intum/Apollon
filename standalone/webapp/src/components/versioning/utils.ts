import type { PendingVersion } from "@/stores/useVersionStore"

/**
 * Structural fingerprint for dirty detection. Mirrors `structuralFingerprint`
 * in `services/autoVersion.ts` on the server — both hash the same six fields
 * with the same VOLATILE_KEYS replacer, pinned by an integration test.
 *
 * The replacer drops UI/transient flags (selected, dragging, resizing, hidden,
 * measured) and capability flags (selectable, draggable, connectable, deletable)
 * so that React-Flow measurement noise doesn't register as a user change.
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

/**
 * True when the version should be treated as a user-intentional milestone:
 * either the user explicitly saved it (kind='user') or an auto-snapshot was
 * later given a name / description.
 */
export function isNamedVersion(v: PendingVersion): boolean {
  return v.kind === "user" || Boolean(v.name?.trim() || v.description?.trim())
}

export type GroupedEntry =
  | { kind: "single"; version: PendingVersion }
  | {
      kind: "auto-group"
      first: PendingVersion
      versions: PendingVersion[]
    }

/**
 * Collapse consecutive unnamed rows under a single expander.
 * Named versions always render as individual rows.
 */
export function groupUnnamedRuns(
  versions: readonly PendingVersion[]
): GroupedEntry[] {
  const out: GroupedEntry[] = []
  let i = 0
  while (i < versions.length) {
    const v = versions[i]!
    if (isNamedVersion(v)) {
      out.push({ kind: "single", version: v })
      i++
      continue
    }
    const run: PendingVersion[] = []
    while (i < versions.length && !isNamedVersion(versions[i]!)) {
      run.push(versions[i]!)
      i++
    }
    if (run.length === 1) {
      out.push({ kind: "single", version: run[0]! })
    } else {
      out.push({ kind: "auto-group", first: run[0]!, versions: run })
    }
  }
  return out
}
