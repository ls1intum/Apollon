import { VersionApiClient } from "@/services/DiagramApiClient"
import { MAX_VERSIONS_PER_DIAGRAM } from "@/constants"
import type {
  CreateVersionResult,
  ListVersionsResponse,
  RestoreVersionResult,
  VersionRepository,
} from "./types"

/**
 * REST-backed adapter. Pure passthrough to the existing `VersionApiClient`
 * — no behavior change for the collab path. Kept thin on purpose so the
 * collab regression surface is one delegating module.
 */
export const RemoteVersionRepository = {
  kind: "remote" as const,
  cap: MAX_VERSIONS_PER_DIAGRAM,

  list(diagramId, opts): Promise<ListVersionsResponse> {
    return VersionApiClient.list(diagramId, opts)
  },
  async create(diagramId, body, opts): Promise<CreateVersionResult> {
    return VersionApiClient.create(diagramId, body, opts)
  },
  getBody(
    diagramId: string,
    versionId: string,
    opts?: { signal?: AbortSignal }
  ) {
    return VersionApiClient.getBody(diagramId, versionId, opts)
  },
  async restore(diagramId, versionId, opts): Promise<RestoreVersionResult> {
    return VersionApiClient.restore(diagramId, versionId, opts)
  },
  editInfo(diagramId, versionId, patch) {
    return VersionApiClient.editInfo(diagramId, versionId, patch)
  },
  delete(diagramId, versionId) {
    return VersionApiClient.delete(diagramId, versionId)
  },
  permalink(diagramId, versionId) {
    return VersionApiClient.permalink(diagramId, versionId)
  },
} satisfies VersionRepository
