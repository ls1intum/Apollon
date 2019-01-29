import Element from './../Element';
import { Point } from '../geo';
import { RelationshipKind } from '../../services/Interface/ExternalState';

export type RectEdge = "TOP" | "LEFT" | "RIGHT" | "BOTTOM";

export interface Relationship extends Element {
  kind: RelationshipKind;
  source: RelationshipEnd;
  target: RelationshipEnd;
  straightLine: boolean;
}
export class Relationship {}

export default Relationship

export { RelationshipKind } from '../../services/Interface/ExternalState';

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
