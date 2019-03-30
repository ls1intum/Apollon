import { ObjectRelationshipType } from '..';
import { Relationship } from '../../../services/relationship/relationship';

export class ObjectLink extends Relationship {
  type = ObjectRelationshipType.ObjectLink;
}
