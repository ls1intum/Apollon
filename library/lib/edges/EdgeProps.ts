import { Edge, EdgeProps } from "@xyflow/react"
import { IPoint } from "./Connection"

// Define message structure with direction
export interface MessageData {
  id: string
  text: string
  direction: "target" | "source" // target = source to target, source = target to source
}

export type CustomEdgeProps = {
  sourceRole: string | null
  sourceMultiplicity: string | null
  targetRole: string | null
  targetMultiplicity: string | null
  points: IPoint[]
  label?: string | null
  messages?: MessageData[] // For communication diagram edges with direction-aware messages
  // Entity-Relationship connector (entity↔relationship). The cardinality is a
  // single label per branch — each entity/relationship pair is its own edge.
  // Stored verbatim so both Chen ratio ("1"/"N"/"M") and (min,max) notations are
  // supported without a diagram-level mode (placement-preserving / look-across).
  cardinality?: string | null
  // Participation of the connected entity: "total" renders a double line.
  participation?: "partial" | "total"
  strokeColor?: string
  textColor?: string
}

export type ExtendedEdgeProps = EdgeProps<Edge<CustomEdgeProps>> & {
  markerEnd?: string
  markerPadding?: number
  strokeDashArray?: string
  type: string
}
