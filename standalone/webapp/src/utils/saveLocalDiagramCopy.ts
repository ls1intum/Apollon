import type { UMLModel } from "@tumaet/apollon"

/**
 * Deep-clone a source diagram model into a brand-new local copy with a fresh
 * id. Shared by the navbar `SaveLocalCopyButton` (which has the live editor
 * model in hand) and the home `DiagramCard` actions menu (which fetches the
 * shared model from the server first).
 *
 * A shallow spread would leave `nodes`/`edges`/`assessments` referenced by both
 * the source and the copy, so subsequent edits in either would corrupt the
 * other. `structuredClone` is Baseline 2022.
 */
export const cloneModelAsLocalCopy = (source: UMLModel): UMLModel => ({
  ...structuredClone(source),
  id: crypto.randomUUID(),
})
