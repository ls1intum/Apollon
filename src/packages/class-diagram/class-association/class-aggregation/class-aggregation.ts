import { ClassAssociation } from '../class-association';
import { ClassRelationshipType } from '../..';

export class ClassAggregation extends ClassAssociation {
  type = ClassRelationshipType.ClassAggregation;
}
