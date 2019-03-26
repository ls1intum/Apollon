import { Relationship }  from '../../../../services/relationship';
import { RelationshipType } from '..';

class UseCaseExtend extends Relationship {
  static features = { ...Relationship.features, straight: true };

  type = RelationshipType.UseCaseExtend;
}

export default UseCaseExtend;
