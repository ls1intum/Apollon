/**
 * Shared zod schemas for diagram + version routes. Defined once so the same
 * URL grammar and body shape is enforced consistently across endpoints, and
 * a future change to the diagram wire shape touches one file.
 */
import { z } from "zod"

export const DiagramId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "diagramId must be URL-safe")

export const VersionId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "versionId must be URL-safe")

export const DiagramBody = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  title: z.string(),
  type: z.string().min(1),
  nodes: z.array(z.unknown()).default([]),
  edges: z.array(z.unknown()).default([]),
  // Apollon library shapes; we don't validate the inner nodes/edges/assessments
  // because the library owns that contract and forward-compatibility there is
  // a library-versioning concern, not a server-validation concern.
  assessments: z.record(z.string(), z.unknown()).default({}),
  interactive: z.unknown().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const PutDiagramBody = DiagramBody.omit({ id: true })

export const PaginationQuery = z.object({
  limit: z.coerce.number().int().positive().max(100).default(25),
  before: z.string().optional(),
})

export const DiagramIdParams = z.object({ diagramId: DiagramId })

export const DiagramIdAndVersionIdParams = z.object({
  diagramId: DiagramId,
  versionId: VersionId,
})
