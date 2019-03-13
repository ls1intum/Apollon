import Relationship from '../../../Relationship';
import { RelationshipKind } from '..';

class UseCaseInheritance extends Relationship {
  static features = { ...Relationship.features, straight: true };

  kind = RelationshipKind.UseCaseInheritance;
}

export default UseCaseInheritance;
