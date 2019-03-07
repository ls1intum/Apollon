import Association, { AssociationComponent } from './Association';
import { RelationshipKindMarker } from '../../../rendering/renderers/svg/defs/RelationshipMarkers';

class Dependency extends Association {
  readonly kind: string = 'Dependency';
}

export const DependencyComponent = AssociationComponent(
  RelationshipKindMarker.Arrow,
  true
);

export default Dependency;
