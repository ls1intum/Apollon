import Element from './../Element';
import { Point } from '../geo';

export type RectEdge = "TOP" | "LEFT" | "RIGHT" | "BOTTOM";

export interface Relationship extends Element {
  kind: RelationshipKind;
  source: RelationshipEnd;
  target: RelationshipEnd;
  straightLine: boolean;
}

export const enum RelationshipKind {
  Aggregation = "AGGREGATION",
  AssociationBidirectional = "ASSOCIATION_BIDIRECTIONAL",
  AssociationUnidirectional = "ASSOCIATION_UNIDIRECTIONAL",
  Inheritance = "INHERITANCE",
  Composition = "COMPOSITION",
  Dependency = "DEPENDENCY",
  Realization = "REALIZATION",
  ActivityControlFlow = "ACTIVITY_CONTROL_FLOW"
}

export interface RelationshipEnd {
  entityId: string;
  multiplicity: string | null;
  role: string | null;
  edge: RectEdge;
  edgeOffset: number;
}

export interface LayoutedRelationship {
  relationship: Relationship;
  source: Element;
  target: Element;
  path: Point[];
}
