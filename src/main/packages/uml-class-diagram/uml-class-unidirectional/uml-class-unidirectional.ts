import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association.js';

export class UMLClassUnidirectional extends UMLAssociation {
  type = ClassRelationshipType.ClassUnidirectional;
}
