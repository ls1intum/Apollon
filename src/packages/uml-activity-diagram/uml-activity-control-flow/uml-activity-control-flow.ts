import { ActivityRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class UMLActivityControlFlow extends UMLRelationship {
  type = ActivityRelationshipType.ActivityControlFlow;
}
