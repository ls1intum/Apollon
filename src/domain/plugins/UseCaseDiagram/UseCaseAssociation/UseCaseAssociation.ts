import Relationship from '../../../Relationship';
import { RelationshipKind } from '..';

class UseCaseAssociation extends Relationship {
  static features = { ...Relationship.features, straight: true };

  type = RelationshipKind.UseCaseAssociation;
}

export default UseCaseAssociation;
