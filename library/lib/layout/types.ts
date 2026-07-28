import type { ApollonFitViewOptions } from "@/overlay/types"

export type DiagramLayoutPosition = Readonly<{ x: number; y: number }>

export type DiagramLayoutAvailabilityReason =
  | "not-ready"
  | "not-modifiable"
  | "not-enough-nodes"
  | "too-large"
  | "nested-nodes"
  | "unmeasured-nodes"
  | "interaction-active"

export type DiagramLayoutAvailability =
  | Readonly<{ available: true }>
  | Readonly<{
      available: false
      reason: DiagramLayoutAvailabilityReason
    }>

export type ArrangeDiagramResult =
  | Readonly<{
      status: "applied"
      movedNodeCount: number
      replacedManualRouteCount: number
    }>
  | Readonly<{ status: "unchanged" }>
  | Readonly<{ status: "stale" }>
  | Readonly<{
      status: "confirmation-required"
      manualRouteCount: number
    }>
  | Readonly<{
      status: "unavailable"
      reason: DiagramLayoutAvailabilityReason
    }>

export type ArrangeDiagramOptions = Readonly<{
  /** Abort the in-flight Worker job without applying a partial layout. */
  signal?: AbortSignal
  /**
   * Permit Arrange to replace visible authored bends and pinned endpoints with
   * automatic routing. Without this flag, such a diagram returns
   * `confirmation-required` without starting a Worker or mutating the model.
   */
  replaceManualRoutes?: boolean
  /**
   * Frame the arranged diagram after node positions change. Defaults to true;
   * pass false to preserve the viewport or options to customize the fit.
   */
  fitView?: boolean | ApollonFitViewOptions
}>

export type DiagramLayoutPositions = Readonly<
  Record<string, DiagramLayoutPosition>
>

/** Exact model changes made by one atomic layout transaction. */
export type DiagramLayoutChangeSummary = Readonly<{
  movedNodeCount: number
  replacedManualRouteCount: number
}>
