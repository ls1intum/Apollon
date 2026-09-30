import { Edge, EdgeProps } from "@xyflow/react"
import { IPoint } from "./Connection"
import type { FreeformEdgeAnchor } from "@/utils/edgeUtils"

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
  sourceAnchor?: FreeformEdgeAnchor
  targetAnchor?: FreeformEdgeAnchor
  label?: string | null
  messages?: MessageData[] // For communication diagram edges with direction-aware messages
  /**
   * Deployment / C4 relations only: a bracketed technology marker and a
   * description, stacked under the label. The node-side equivalent of
   * `DescribedNodeProps` — a C4 relation carries the same two annotations its
   * boxes do, and `label` alone cannot say what a connection runs over.
   */
  technology?: string
  description?: string
  strokeColor?: string
  textColor?: string
}

export type ExtendedEdgeProps = EdgeProps<Edge<CustomEdgeProps>> & {
  markerEnd?: string
  markerPadding?: number
  strokeDashArray?: string
  type: string
}
