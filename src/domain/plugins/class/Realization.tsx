import Association, { AssociationComponent } from './Association';
import { RelationshipKindMarker } from '../../../rendering/renderers/svg/defs/RelationshipMarkers';

class Realization extends Association {
  readonly kind: string = 'Realization';
}

export const RealizationComponent = AssociationComponent(
  RelationshipKindMarker.Triangle,
  true
);

export default Realization;
