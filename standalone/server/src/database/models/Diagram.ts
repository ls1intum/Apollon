export interface Diagram {
  id: string
  version: string
  title: string
  type: string
  nodes: unknown[]
  edges: unknown[]
  assessments: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/** TTL for diagrams in Redis: 60 days in seconds */
export const DIAGRAM_TTL_SECONDS = 60 * 24 * 60 * 60
