import { Relationship } from '../../../../services/relationship';
import { RelationshipType } from '..';

class ObjectLink extends Relationship {
  type = RelationshipType.ObjectLink;
}

export default ObjectLink;
