import { isNamedVersion } from "@/lib/version/predicates"
import type { PendingVersion } from "@/stores/useVersionStore"

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
