import { ObjectRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class ObjectLink extends UMLRelationship {
  type = ObjectRelationshipType.ObjectLink;
}
