import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association';

export class ClassRealization extends UMLAssociation {
  type = ClassRelationshipType.ClassRealization;
}
