import { UseCaseRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class UMLUseCaseInclude extends UMLRelationship {
  static features = { ...UMLRelationship.features, straight: true };

  type = UseCaseRelationshipType.UseCaseInclude;
}
