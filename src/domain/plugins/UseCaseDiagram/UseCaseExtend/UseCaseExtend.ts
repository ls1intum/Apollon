import Relationship from '../../../Relationship';
import { RelationshipKind } from '..';

class UseCaseExtend extends Relationship {
  static features = { ...Relationship.features, straight: true };

  type = RelationshipKind.UseCaseExtend;
}

export default UseCaseExtend;
