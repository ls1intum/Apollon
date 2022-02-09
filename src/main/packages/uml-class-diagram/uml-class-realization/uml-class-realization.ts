import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association.js';

export class UMLClassRealization extends UMLAssociation {
  type = ClassRelationshipType.ClassRealization;
}
