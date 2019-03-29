import { Relationship } from '../../../services/relationship/relationship';
import { UseCaseRelationshipType } from '..';

export class UseCaseAssociation extends Relationship {
  static features = { ...Relationship.features, straight: true };

  type = UseCaseRelationshipType.UseCaseAssociation;
}
