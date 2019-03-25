import Relationship from '../../../Relationship';
import { RelationshipKind } from '..';

class UseCaseInclude extends Relationship {
  static features = { ...Relationship.features, straight: true };

  type = RelationshipKind.UseCaseInclude;
}

export default UseCaseInclude;
