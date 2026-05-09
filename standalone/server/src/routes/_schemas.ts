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

/**
 * Library schema versions are `4.<minor>.<patch>` (the same shape
 * the library's `UMLModel.version` template-literal type encodes),
 * optionally followed by a SemVer-2.0 pre-release or build-metadata
 * suffix (`4.0.0-rc1`, `4.1.0+ci.42`). Enforcing the regex at the
 * API boundary means the renderer never receives a malformed
 * version, and the `toUmlModel` projection downstream can widen
 * `string` → the literal type via a runtime-validated assertion.
 */
export const LibrarySchemaVersion = z
  .string()
  .regex(
    /^4\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/,
    "version must match the library schema pattern 4.<minor>.<patch> with an optional SemVer pre-release and/or build-metadata suffix"
  )

export const DiagramBody = z.object({
  id: z.string().min(1),
  version: LibrarySchemaVersion,
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
