import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association';

export class ClassDependency extends UMLAssociation {
  type = ClassRelationshipType.ClassDependency;
}
