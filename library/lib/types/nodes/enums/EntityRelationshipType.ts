// Entity-Relationship (Chen notation) discriminators.
//
// Variants are modelled as enum/flag *properties* on a small set of node types
// (the `ClassType` stereotype precedent) rather than as a separate node type per
// variant, because the visual decorations combine: a Chen attribute can be both
// derived and multivalued, a composite key exists, and so on.

export enum ErEntityKind {
  Strong = "Strong",
  // Existence-dependent on an owner entity via an identifying relationship.
  Weak = "Weak",
}

export enum ErRelationshipKind {
  Regular = "Regular",
  // Identifies a weak entity through its owner.
  Identifying = "Identifying",
}

// How an entity participates in a relationship, drawn as the line weight on the
// connector (Chen / Elmasri-Navathe): partial = single line, total = double line.
export type ErParticipation = "partial" | "total"
