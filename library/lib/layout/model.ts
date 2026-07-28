import type { SerializedSolverInput } from "@/utils/geometry/edgeGeometryWorkerProtocol"

export type DiagramLayoutEdgeLabels = Readonly<{
  middle?: string
  middleWidth?: number
  sourceRole?: string
  sourceRoleWidth?: number
  sourceMultiplicity?: string
  sourceMultiplicityWidth?: number
  targetRole?: string
  targetRoleWidth?: number
  targetMultiplicity?: string
  targetMultiplicityWidth?: number
}>

/**
 * Worker-safe layout domain snapshot. Routing keeps its minimal transport
 * contract; layout-only rendered facts live alongside it instead of leaking
 * into the edge solver protocol.
 */
export type DiagramLayoutSnapshot = Readonly<{
  solver: SerializedSolverInput
  edgeLabels: Readonly<Record<string, DiagramLayoutEdgeLabels>>
}>
