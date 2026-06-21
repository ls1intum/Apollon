// Entity-Relationship discriminators (Chen and crow's-foot notations).
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

// Crow's-foot (Information Engineering) cardinality at one end of a relationship.
// Each value combines a minimum (0 = optional → circle, 1 = mandatory → bar) and
// a maximum (1 → bar, many → crow's foot). This is the notation Mermaid, dbdiagram
// and most modern DB-design tools use.
export type ErCfCardinality =
  | "ZeroOrOne" // o| — optional, at most one
  | "ExactlyOne" // || — mandatory, exactly one
  | "ZeroOrMany" // o< — optional, many
  | "OneOrMany" // |< — mandatory, at least one

// Defaults for a new connection — a "1 to 0..*" relationship, the most common
// starting point. Single source of truth for the edge renderer and its popover.
export const DEFAULT_ER_CF_SOURCE_CARDINALITY: ErCfCardinality = "ExactlyOne"
export const DEFAULT_ER_CF_TARGET_CARDINALITY: ErCfCardinality = "ZeroOrMany"
