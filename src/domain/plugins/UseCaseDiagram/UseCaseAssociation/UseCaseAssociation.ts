import Relationship from '../../../Relationship';
import { RelationshipKind } from '..';

class UseCaseAssociation extends Relationship {
  static features = { ...Relationship.features, straight: true };

  kind = RelationshipKind.UseCaseAssociation;
}

export default UseCaseAssociation;
