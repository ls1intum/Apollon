import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association';

export class UMLClassComposition extends UMLAssociation {
  type = ClassRelationshipType.ClassComposition;
}
