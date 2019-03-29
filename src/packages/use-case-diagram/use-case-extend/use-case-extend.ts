import { Relationship }  from '../../../services/relationship/relationship';
import { UseCaseRelationshipType } from '..';

export class UseCaseExtend extends Relationship {
  static features = { ...Relationship.features, straight: true };

  type = UseCaseRelationshipType.UseCaseExtend;
}
