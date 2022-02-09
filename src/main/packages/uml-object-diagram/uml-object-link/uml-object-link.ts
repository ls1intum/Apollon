import { ObjectRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship.js';

export class UMLObjectLink extends UMLRelationship {
  type = ObjectRelationshipType.ObjectLink;
}
