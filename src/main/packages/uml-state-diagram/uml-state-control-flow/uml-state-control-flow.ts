import { StateRelationshipType } from '..';
import { UMLRelationshipCenteredDescription } from '../../../services/uml-relationship/uml-relationship-centered-description';

export class UMLStateControlFlow extends UMLRelationshipCenteredDescription {
  type = StateRelationshipType.StateControlFlow;
} 