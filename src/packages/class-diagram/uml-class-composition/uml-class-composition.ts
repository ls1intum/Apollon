import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association';

export class ClassComposition extends UMLAssociation {
  type = ClassRelationshipType.ClassComposition;
}
