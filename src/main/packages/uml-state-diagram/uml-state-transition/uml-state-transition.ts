import { StateRelationshipType } from '..';
import { UMLRelationshipCenteredDescription } from '../../../services/uml-relationship/uml-relationship-centered-description';

export class UMLStateTransition extends UMLRelationshipCenteredDescription {
  type = StateRelationshipType.StateTransition;
} 