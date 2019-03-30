import { ActivityRelationshipType } from '..';
import { Relationship } from '../../../services/relationship/relationship';

export class ActivityControlFlow extends Relationship {
  type = ActivityRelationshipType.ActivityControlFlow;
}
