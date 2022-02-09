import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association.js';

export class UMLClassDependency extends UMLAssociation {
  type = ClassRelationshipType.ClassDependency;
}
