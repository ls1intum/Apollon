import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association';

export class UMLClassBidirectional extends UMLAssociation {
  type = ClassRelationshipType.ClassBidirectional;
}
