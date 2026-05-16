import { LocalVersionRepository } from "./LocalVersionRepository"
import { RemoteVersionRepository } from "./RemoteVersionRepository"
import type { VersionRepository } from "./types"

/**
 * Module-level holder for the active repository. Pages set the holder on
 * mount via `setVersionRepository(...)`. React Router renders `ApollonLocal`
 * and `ApollonWithConnection` mutually exclusively, so there is no concurrent
 * mount race; setting from each page's effect is idempotent under StrictMode/HMR.
 *
 * Default = `RemoteVersionRepository`: if a non-page consumer ever calls into
 * the store before any page has mounted (e.g. a deep-link to /:id/?version=…),
 * the safe collab default keeps the call from blowing up.
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
