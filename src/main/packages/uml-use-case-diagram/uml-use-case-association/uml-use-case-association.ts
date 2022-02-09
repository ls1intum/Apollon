import { UseCaseRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship.js';

export class UMLUseCaseAssociation extends UMLRelationship {
  static features = { ...UMLRelationship.features, straight: true };

  type = UseCaseRelationshipType.UseCaseAssociation;
}
