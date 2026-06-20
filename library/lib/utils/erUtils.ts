// Connection rules for the Entity-Relationship (Chen) diagram.
//
// A valid Chen diagram is (almost) bipartite: entities connect to relationships
// through cardinality connectors, and attributes hang off an owner (entity,
// relationship, or a parent composite attribute) through plain link edges.
// Classifying a prospective connection here lets the connect flow both reject
// nonsense and pick the right edge type automatically, so a student can only
// draw structurally valid diagrams.
//
// Node type strings are compared as literals (not via DiagramNodeTypeRecord) to
// avoid a utils → nodes import cycle.

const ER_ENTITY = "erEntity"
const ER_RELATIONSHIP = "erRelationship"
const ER_ATTRIBUTE = "erAttribute"

export type ErEdgeType = "ErConnector" | "ErLink"

export type ErConnectionVerdict =
  | { valid: true; edgeType: ErEdgeType }
  | { valid: false }

const INVALID: ErConnectionVerdict = { valid: false }

/**
 * Classify a prospective ER connection between two node types.
 *
 * - entity ↔ relationship → cardinality connector (`ErConnector`)
 * - attribute ↔ entity / relationship / attribute → plain link (`ErLink`)
 * - entity ↔ entity, relationship ↔ relationship, or anything involving a
 *   non-ER node → invalid
 */
export function classifyErConnection(
  sourceType: string | undefined,
  targetType: string | undefined
): ErConnectionVerdict {
  if (!sourceType || !targetType) return INVALID

  const isErNode = (t: string) =>
    t === ER_ENTITY || t === ER_RELATIONSHIP || t === ER_ATTRIBUTE
  if (!isErNode(sourceType) || !isErNode(targetType)) return INVALID

  // Anything touching an attribute is a link (incl. composite attribute→attribute).
  if (sourceType === ER_ATTRIBUTE || targetType === ER_ATTRIBUTE) {
    return { valid: true, edgeType: "ErLink" }
  }

  if (
    (sourceType === ER_ENTITY && targetType === ER_RELATIONSHIP) ||
    (sourceType === ER_RELATIONSHIP && targetType === ER_ENTITY)
  ) {
    return { valid: true, edgeType: "ErConnector" }
  }

  // entity↔entity and relationship↔relationship are not valid Chen edges.
  return INVALID
}
