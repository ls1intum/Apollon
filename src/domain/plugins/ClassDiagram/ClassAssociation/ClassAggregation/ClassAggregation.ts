import ClassAssociation from '../ClassAssociation';
import { RelationshipKind } from '../..';

class ClassAggregation extends ClassAssociation {
  kind = RelationshipKind.ClassAggregation;
}

export default ClassAggregation;
