import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association';

export class ClassUnidirectional extends UMLAssociation {
  type = ClassRelationshipType.ClassUnidirectional;
}
