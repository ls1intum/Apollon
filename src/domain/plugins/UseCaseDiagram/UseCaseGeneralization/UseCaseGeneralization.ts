import Relationship from '../../../Relationship';
import { RelationshipKind } from '..';

class UseCaseGeneralization extends Relationship {
  static features = { ...Relationship.features, straight: true };

  type = RelationshipKind.UseCaseGeneralization;
}

export default UseCaseGeneralization;
