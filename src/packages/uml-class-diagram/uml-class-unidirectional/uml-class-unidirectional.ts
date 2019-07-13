import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association';

export class UMLClassUnidirectional extends UMLAssociation {
  type = ClassRelationshipType.ClassUnidirectional;
}
