import { Relationship } from '../../../../services/relationship';
import { RelationshipType } from '..';

class UseCaseInclude extends Relationship {
  static features = { ...Relationship.features, straight: true };

  type = RelationshipType.UseCaseInclude;
}

export default UseCaseInclude;
