import { Relationship } from '../../../../services/relationship';
import { RelationshipType } from '..';

class UseCaseAssociation extends Relationship {
  static features = { ...Relationship.features, straight: true };

  type = RelationshipType.UseCaseAssociation;
}

export default UseCaseAssociation;
