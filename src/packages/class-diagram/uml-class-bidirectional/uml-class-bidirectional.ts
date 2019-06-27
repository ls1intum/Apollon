import { ClassRelationshipType } from '..';
import { UMLAssociation } from '../../common/uml-association/uml-association';

export class ClassBidirectional extends UMLAssociation {
  type = ClassRelationshipType.ClassBidirectional;
}
