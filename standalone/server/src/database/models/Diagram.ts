import type {
  ApollonNode,
  ApollonEdge,
  Assessment,
  UMLDiagramType,
} from "@tumaet/apollon"

export interface Diagram {
  id: string
  version: string
  title: string
  type: UMLDiagramType
  nodes: ApollonNode[]
  edges: ApollonEdge[]
  assessments: Record<string, Assessment>
  createdAt: string
  updatedAt: string
}

/** TTL for diagrams in Redis: 120 days in seconds */
export const DIAGRAM_TTL_SECONDS = 120 * 24 * 3600
