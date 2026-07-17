import type { VersionSummary } from "./api"

/**
 * A row as the version-history UI renders it: either a server-committed
 * summary, or a client-side optimistic row derived from an in-flight create
 * mutation (`pending` while saving, `failed` when the save errored).
 */
export interface PendingVersion extends VersionSummary {
  pending?: true
  failed?: boolean
}
