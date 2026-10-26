import type { UMLModel } from "@tumaet/apollon"
import { serverURL } from "@/constants"
import {
  buildSharedDiagramUrl,
  normalizeSharedDiagramView,
} from "@/utils/sharedDiagramLinks"
import {
  discardSharedDiagramWriteToken,
  getSharedDiagramWriteToken,
  storeSharedDiagramWriteToken,
} from "@/utils/sharedDiagramStorage"
import type {
  ApiErrorBody,
  ApiErrorCode,
  Diagram,
  VersionSummary,
} from "@/types"

export type StoredDiagram = Diagram

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly meta?: Record<string, unknown>
  ) {
    super(message)
    this.name = "ApiError"
  }
}

interface RequestOpts {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  /** When true, sends/receives credentials (cookies). Default: true. */
  credentials?: RequestCredentials
}

async function request<T>(
  path: string,
  opts: RequestOpts = {}
): Promise<{ data: T; res: Response }> {
  const url = `${serverURL}${path}`
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...opts.headers,
  }
  const diagramId = /^\/api\/diagrams\/([^/?#]+)/.exec(path)?.[1]
  const writeToken = diagramId
    ? getSharedDiagramWriteToken(diagramId)
    : undefined
  if (writeToken) headers.Authorization = `Bearer ${writeToken}`
  if (opts.body !== undefined && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body:
      opts.body === undefined
        ? undefined
        : opts.body instanceof FormData
          ? opts.body
          : JSON.stringify(opts.body),
    credentials: opts.credentials ?? "include",
    signal: opts.signal,
  })

  if (res.status === 204) {
    return { data: undefined as unknown as T, res }
  }

  let parsed: unknown = undefined
  const contentType = res.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    parsed = await res.json().catch(() => undefined)
  }

  if (!res.ok) {
    const body = (parsed as ApiErrorBody | undefined) ?? {
      error: "INTERNAL" as ApiErrorCode,
      message: `Request failed with status ${res.status}`,
      requestId: "",
    }
    if (diagramId && writeToken && body.error === "INVALID_CAPABILITY") {
      // Diagrams stay publicly readable when a capability is revoked (for
      // example after OWNER_SECRET rotation), so a read retries without it.
      // The retry cannot loop: the discarded token is never sent again.
      discardSharedDiagramWriteToken(diagramId, writeToken)
      if ((opts.method ?? "GET") === "GET") return request<T>(path, opts)
    }
    throw new ApiError(res.status, body.error, body.message, body)
  }

  return { data: parsed as T, res }
}

export const DiagramApiClient = {
  async fetchDiagram(
    diagramId: string,
    opts: { signal?: AbortSignal } = {}
  ): Promise<Diagram> {
    const { data } = await request<Diagram>(`/api/diagrams/${diagramId}`, {
      signal: opts.signal,
    })
    const { writeToken, ...diagram } = data
    if (writeToken) storeSharedDiagramWriteToken(diagramId, writeToken)
    return diagram
  },

  /**
   * Autosave PUT. Returns the new headRev so clients can carry it as
   * `If-Match` on the next save (advisory race detection).
   */
  async sendDiagramUpdate(
    diagramId: string,
    model: UMLModel,
    opts: { ifMatch?: number } = {}
  ): Promise<{ headRev: number; updatedAt: string }> {
    const headers: Record<string, string> = {}
    if (opts.ifMatch !== undefined) headers["If-Match"] = String(opts.ifMatch)
    const { data } = await request<{ headRev: number; updatedAt: string }>(
      `/api/diagrams/${diagramId}`,
      { method: "PUT", body: model, headers }
    )
    return data
  },

  async createDiagram(model: UMLModel): Promise<Diagram> {
    const { data } = await request<Diagram>(`/api/diagrams`, {
      method: "POST",
      body: model,
    })
    const { writeToken, ...diagram } = data
    if (writeToken) storeSharedDiagramWriteToken(data.id, writeToken)
    return diagram
  },

  async deleteDiagram(diagramId: string): Promise<void> {
    await request<void>(`/api/diagrams/${diagramId}`, { method: "DELETE" })
  },

  async fetchStoredDiagram(
    diagramId: string,
    opts: { signal?: AbortSignal } = {}
  ): Promise<StoredDiagram | null> {
    try {
      return await DiagramApiClient.fetchDiagram(diagramId, opts)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    }
  },
}

export interface ListVersionsResponse {
  versions: VersionSummary[]
  nextCursor?: string
  /** Total number of versions in the index (across all pages). */
  total: number
}

export interface RestoreVersionResponse {
  headRev: number
  updatedAt: string
  autoSnapshotVersionId: string
}

export const VersionApiClient = {
  async list(
    diagramId: string,
    opts: { limit?: number; before?: string; signal?: AbortSignal } = {}
  ): Promise<ListVersionsResponse> {
    const params = new URLSearchParams()
    if (opts.limit !== undefined) params.set("limit", String(opts.limit))
    if (opts.before !== undefined) params.set("before", opts.before)
    const qs = params.toString()
    const { data } = await request<ListVersionsResponse>(
      `/api/diagrams/${diagramId}/versions${qs ? `?${qs}` : ""}`,
      { signal: opts.signal }
    )
    return data
  },

  async create(
    diagramId: string,
    body: UMLModel,
    opts: { name?: string; description?: string; actor?: string } = {}
  ): Promise<
    VersionSummary & {
      evictedVersionIds?: string[]
      evictedKinds?: ("unnamed" | "named")[]
      /** Authoritative post-commit total from the server (ZCARD). */
      total?: number
      /** New HEAD revision after the snapshot was committed. */
      headRev?: number
    }
  > {
    const { data } = await request<
      VersionSummary & {
        evictedVersionIds?: string[]
        evictedKinds?: ("unnamed" | "named")[]
        total?: number
        headRev?: number
      }
    >(`/api/diagrams/${diagramId}/versions`, {
      method: "POST",
      body: {
        name: opts.name,
        description: opts.description,
        actor: opts.actor,
        body,
      },
    })
    return data
  },

  async getBody(
    diagramId: string,
    versionId: string,
    opts: { signal?: AbortSignal } = {}
  ): Promise<Diagram> {
    const { data } = await request<Diagram>(
      `/api/diagrams/${diagramId}/versions/${versionId}`,
      { signal: opts.signal }
    )
    return data
  },

  async restore(
    diagramId: string,
    versionId: string,
    opts: { currentBody?: UMLModel; actor?: string } = {}
  ): Promise<RestoreVersionResponse> {
    const { data } = await request<RestoreVersionResponse>(
      `/api/diagrams/${diagramId}/versions/${versionId}/restore`,
      {
        method: "POST",
        body: { currentBody: opts.currentBody, actor: opts.actor },
      }
    )
    return data
  },

  async editInfo(
    diagramId: string,
    versionId: string,
    patch: { name?: string; description?: string }
  ): Promise<VersionSummary> {
    const { data } = await request<VersionSummary>(
      `/api/diagrams/${diagramId}/versions/${versionId}`,
      { method: "PATCH", body: patch }
    )
    return data
  },

  async delete(diagramId: string, versionId: string): Promise<void> {
    await request<void>(`/api/diagrams/${diagramId}/versions/${versionId}`, {
      method: "DELETE",
    })
  },

  /**
   * Permalink to a specific version, opened in preview mode. Preserves the
   * current `view` param — ApollonShared rejects URLs that omit it ("Invalid
   * view type"). The link never carries the write capability: a version link
   * is for reading, and its recipients must not get write, restore, or delete
   * access.
   */
  permalink(diagramId: string, versionId: string): string {
    const view = normalizeSharedDiagramView(
      new URLSearchParams(window.location.search).get("view")
    )
    return `${buildSharedDiagramUrl(diagramId, view)}&version=${encodeURIComponent(versionId)}`
  },
}
