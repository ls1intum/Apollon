import Element from './../Element';
import { Point } from '../geo';
import { Relationship as ExternalRelationship, RelationshipKind } from '../../services/Interface/ExternalState';

export type RectEdge = 'TOP' | 'LEFT' | 'RIGHT' | 'BOTTOM';

// export interface Relationship extends Element {
//   kind: RelationshipKind;
//   source: RelationshipEnd;
//   target: RelationshipEnd;
//   straightLine: boolean;
// }
// export class Relationship {}

import Relationship from './Relationship';

export default Relationship;
export { ActionTypes as RelationshipActionTypes } from './types';
export { default as RelationshipRepository } from './repository';
export { default as RelationshipReducer } from './reducer';
export { default as RelationshipSaga } from './saga';

export { RelationshipKind } from '../../services/Interface/ExternalState';

export interface RelationshipEnd {
  entityId: string;
  multiplicity: string | null;
  role: string | null;
  edge: RectEdge;
  edgeOffset: number;
}

export interface LayoutedRelationship {
  relationship: ExternalRelationship;
  source: Element;
  target: Element;
  path: Point[];
}
