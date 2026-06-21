// Wire-compatible mirror of server-side @tumaet/server types.ts.
// Kept in sync manually; small surface, two engineers, type-only duplication
// is cheaper than a shared workspace at this scale.

import type { UMLModel } from "@tumaet/apollon/react"

/**
 * Wire shape for the live diagram (HEAD) and snapshot bodies. Extends the
 * library's `UMLModel` so the editor can consume the body without runtime
 * coercion. The library schema version is structurally enforced via
 * `UMLModel.version: ` `4.${number}.${number}` ``.
 */
export type Diagram = UMLModel & {
  createdAt: string
  updatedAt: string
}

export type VersionKind = "user" | "auto"

export interface VersionSummary {
  id: string
  diagramId: string
  name: string
  description: string
  createdAt: string
  kind: VersionKind
  librarySchemaVersion: string
  /**
   * Monotonic per-diagram counter assigned at commit time. Reflects "Nth
   * version you ever made," not rank-among-currently-stored — survives
   * eviction so the displayed `#N` stays stable. `undefined` for legacy
   * rows committed before the counter was added.
   */
  seq?: number
}

export type ApiErrorCode =
  | "INVALID_PARAMS"
  | "NOT_FOUND"
  | "REVISION_MISMATCH"
  | "BODY_TOO_LARGE"
  | "NO_HEAD"
  | "REDIS_UNAVAILABLE"
  | "RENDERER_BUSY"
  | "INTERNAL"

export interface ApiErrorBody {
  error: ApiErrorCode
  message: string
  requestId: string
  /** Optional metadata — e.g. currentHeadRev on REVISION_MISMATCH. */
  [key: string]: unknown
}

export type ControlEvent =
  | {
      type: "VERSION_CREATED"
      versionId: string
      createdAt: string
      name: string
      kind: VersionKind
      actor?: string
    }
  | {
      type: "VERSION_RESTORED"
      headRev: number
      updatedAt: string
      autoSnapshotVersionId: string
      restoredFromVersionId: string
      actor?: string
    }
  | { type: "VERSION_DELETED"; versionId: string }
  | {
      type: "VERSION_RENAMED"
      versionId: string
      name: string
      description: string
    }
  | { type: "DIAGRAM_DELETED" }

export type Envelope = { kind: "control"; control: ControlEvent }
