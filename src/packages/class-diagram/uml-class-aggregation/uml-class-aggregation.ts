import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association';

export class ClassAggregation extends UMLAssociation {
  type = ClassRelationshipType.ClassAggregation;
}
