import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association.js';

export class UMLClassInheritance extends UMLAssociation {
  type = ClassRelationshipType.ClassInheritance;
}
