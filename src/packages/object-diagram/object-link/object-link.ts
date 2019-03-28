import { Relationship } from '../../../services/relationship/relationship';
import { ObjectRelationshipType } from '..';

export class ObjectLink extends Relationship {
  type = ObjectRelationshipType.ObjectLink;
}
