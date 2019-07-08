import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association';

export class UMLClassAggregation extends UMLAssociation {
  type = ClassRelationshipType.ClassAggregation;
}
