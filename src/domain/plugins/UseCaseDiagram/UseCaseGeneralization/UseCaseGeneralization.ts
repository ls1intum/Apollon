import { Relationship } from '../../../../services/relationship';
import { RelationshipType } from '..';

class UseCaseGeneralization extends Relationship {
  static features = { ...Relationship.features, straight: true };

  type = RelationshipType.UseCaseGeneralization;
}

export default UseCaseGeneralization;
