import Association, { AssociationComponent } from './Association';
import { RelationshipKindMarker } from '../../../rendering/renderers/svg/defs/RelationshipMarkers';

class Aggregation extends Association {
  readonly kind: string = 'Aggregation';
}

export const AggregationComponent = AssociationComponent(
  RelationshipKindMarker.Rhombus
);

export default Aggregation;
