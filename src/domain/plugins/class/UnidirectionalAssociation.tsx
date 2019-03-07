import Association, { AssociationComponent } from './Association';
import { RelationshipKindMarker } from '../../../rendering/renderers/svg/defs/RelationshipMarkers';

class UnidirectionalAssociation extends Association {
  readonly kind: string = 'UnidirectionalAssociation';
}

export const UnidirectionalAssociationComponent = AssociationComponent(
  RelationshipKindMarker.Arrow
);

export default UnidirectionalAssociation;
