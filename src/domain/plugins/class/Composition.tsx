import Association, { AssociationComponent } from './Association';
import { RelationshipKindMarker } from '../../../rendering/renderers/svg/defs/RelationshipMarkers';

class Composition extends Association {
  readonly kind: string = 'Composition';
}

export const CompositionComponent = AssociationComponent(
  RelationshipKindMarker.RhombusFilled
);

export default Composition;
