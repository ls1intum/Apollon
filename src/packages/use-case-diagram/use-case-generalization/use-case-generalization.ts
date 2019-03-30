import { UseCaseRelationshipType } from '..';
import { Relationship } from '../../../services/relationship/relationship';

export class UseCaseGeneralization extends Relationship {
  static features = { ...Relationship.features, straight: true };

  type = UseCaseRelationshipType.UseCaseGeneralization;
}
