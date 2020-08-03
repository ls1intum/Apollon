import { ObjectRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class UMLObjectLink extends UMLRelationship {
  type = ObjectRelationshipType.ObjectLink;
}
