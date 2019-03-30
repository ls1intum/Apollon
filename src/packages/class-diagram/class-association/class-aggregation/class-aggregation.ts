import { ClassRelationshipType } from '../..';
import { ClassAssociation } from '../class-association';

export class ClassAggregation extends ClassAssociation {
  type = ClassRelationshipType.ClassAggregation;
}
