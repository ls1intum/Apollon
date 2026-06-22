import { isNamedVersion } from "@/lib/version/predicates"
import type { VersionMetaRow } from "./idb"

/**
 * Two-pass FIFO eviction: drains rows that fail `isNamedVersion`
 * (kind=user OR has name OR has description) before touching named
 * milestones. `isNamedVersion` is the single source of truth — the
 * drawer uses the same predicate for the autosave-filter toggle.
 */

export interface EvictionInput {
  /** Rows BELONGING TO ONE DIAGRAM, oldest-first (ascending `seq`). */
  rows: ReadonlyArray<
    Pick<VersionMetaRow, "id" | "name" | "description" | "kind">
  >
  cap: number
}

export interface EvictionPlan {
  evictedVersionIds: string[]
  evictedKinds: ("unnamed" | "named")[]
}

export function planEviction({ rows, cap }: EvictionInput): EvictionPlan {
  const overflow = Math.max(0, rows.length - cap)
  if (overflow === 0) {
    return { evictedVersionIds: [], evictedKinds: [] }
  }

  const evictedVersionIds: string[] = []
  const evictedKinds: ("unnamed" | "named")[] = []
  const evictedSet = new Set<string>()
  let toDrop = overflow

  for (const row of rows) {
    if (toDrop === 0) break
    if (!isNamedVersion(row)) {
      evictedVersionIds.push(row.id)
      evictedKinds.push("unnamed")
      evictedSet.add(row.id)
      toDrop -= 1
    }
  }

  if (toDrop === 0) return { evictedVersionIds, evictedKinds }

  for (const row of rows) {
    if (toDrop === 0) break
    if (evictedSet.has(row.id)) continue
    evictedVersionIds.push(row.id)
    evictedKinds.push("named")
    evictedSet.add(row.id)
    toDrop -= 1
  }

  return { evictedVersionIds, evictedKinds }
}
