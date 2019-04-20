import { ActivityRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class ActivityControlFlow extends UMLRelationship {
  type = ActivityRelationshipType.ActivityControlFlow;
}
