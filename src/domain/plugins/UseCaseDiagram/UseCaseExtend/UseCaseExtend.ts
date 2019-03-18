import Relationship from '../../../Relationship';
import { RelationshipKind } from '..';

class UseCaseExtend extends Relationship {
  static features = { ...Relationship.features, straight: true };

  kind = RelationshipKind.UseCaseExtend;
}

export default UseCaseExtend;
