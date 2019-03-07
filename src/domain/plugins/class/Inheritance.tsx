import Association, { AssociationComponent } from './Association';
import { RelationshipKindMarker } from '../../../rendering/renderers/svg/defs/RelationshipMarkers';

class Inheritance extends Association {
  readonly kind: string = 'Inheritance';
}

export const InheritanceComponent = AssociationComponent(
  RelationshipKindMarker.Triangle
);

export default Inheritance;
