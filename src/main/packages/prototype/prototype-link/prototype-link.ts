import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { UMLRelationshipType } from '../../uml-relationship-type';

export class PrototypeLink extends UMLRelationship {
  static features = { ...UMLRelationship.features, straight: true };

  type: UMLRelationshipType = UMLRelationshipType.PrototypeLink;
}
