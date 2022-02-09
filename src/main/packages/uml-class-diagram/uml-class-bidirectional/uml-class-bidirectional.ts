import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association.js';

export class UMLClassBidirectional extends UMLAssociation {
  type = ClassRelationshipType.ClassBidirectional;
}
