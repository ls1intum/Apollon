import { UseCaseRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship.js';

export class UMLUseCaseExtend extends UMLRelationship {
  static features = { ...UMLRelationship.features, straight: true };

  type = UseCaseRelationshipType.UseCaseExtend;
}
