import { UseCaseRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class UseCaseGeneralization extends UMLRelationship {
  static features = { ...UMLRelationship.features, straight: true };

  type = UseCaseRelationshipType.UseCaseGeneralization;
}
