import type {
  ApollonNode,
  ApollonEdge,
  Assessment,
  InteractiveElements,
  UMLDiagramType,
} from "@tumaet/apollon"

/** Wire shape for the live diagram (HEAD) and for snapshot bodies. */
export interface Diagram {
  id: string
  version: string
  title: string
  type: UMLDiagramType
  nodes: ApollonNode[]
  edges: ApollonEdge[]
  assessments: Record<string, Assessment>
  /** Per-element/edge interactivity flags — preserved on round-trip. */
  interactive?: InteractiveElements
  createdAt: string
  updatedAt: string
}

/** Lightweight projection used by version-list endpoints. */
export interface VersionSummary {
  id: string
  diagramId: string
  name: string
  description: string
  createdAt: string
  kind: VersionKind
  librarySchemaVersion: string
  /**
   * Monotonic per-diagram counter assigned at commit time. Survives
   * eviction — versions keep their seq even after older versions are
   * pruned, so the display number reflects "the Nth version you ever
   * made," not "the Nth version still stored." `undefined` for legacy
   * rows committed before this counter existed.
   */
  seq?: number
}

export type VersionKind = "user" | "auto"

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
}

/** Typed control envelopes emitted to the WebSocket room on version events. */
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
