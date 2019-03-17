import Relationship from '../../../Relationship';
import { RelationshipKind } from '..';

class UseCaseInclude extends Relationship {
  static features = { ...Relationship.features, straight: true };

  kind = RelationshipKind.UseCaseInclude;
}

export default UseCaseInclude;
