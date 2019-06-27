import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association';

export class ClassInheritance extends UMLAssociation {
  type = ClassRelationshipType.ClassInheritance;
}
