import { LocalVersionRepository } from "./LocalVersionRepository"
import { RemoteVersionRepository } from "./RemoteVersionRepository"
import type { VersionRepository } from "./types"

/**
 * Module-level holder for the active repository. It must be a module global
 * (not React context) because `useVersionStore`'s async actions read it
 * outside the React tree. Each editor page binds it from its mount effect —
 * before that effect's `fetchVersions` — so the read happens after the write.
 * React Router renders `ApollonLocal` and `ApollonShared` mutually
 * exclusively, so there is no concurrent mount race; the assignment is
 * idempotent under StrictMode/HMR.
 *
 * Default = `RemoteVersionRepository`: if a consumer reaches the store before
 * any page effect has run (e.g. a deep-link to `/shared/:id?version=…`), the
 * safe collab default keeps the call from blowing up.
 */

let active: VersionRepository = RemoteVersionRepository

export function setVersionRepository(next: VersionRepository): void {
  active = next
}

export function getVersionRepository(): VersionRepository {
  return active
}

export { LocalVersionRepository, RemoteVersionRepository }
export { subscribeToLocalVersionEvents } from "./LocalVersionRepository"
export type { VersionRepository } from "./types"
