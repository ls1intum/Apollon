import { ActivityRelationshipType } from '..';
import { UMLRelationshipCenteredDescription } from '../../../services/uml-relationship/uml-relationship-centered-description';

export class UMLActivityControlFlow extends UMLRelationshipCenteredDescription {
  type = ActivityRelationshipType.ActivityControlFlow;
}
