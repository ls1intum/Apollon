import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { UMLRelationshipType } from '../../uml-relationship-type';

/**
 * Represents a transition between elements in a sfc.
 * Transitions can have conditions that determine when flow passes from one element to another.
 */
export class SfcTransition extends UMLRelationship {
  static features = { ...UMLRelationship.features, straight: false, variable: false };
  type: UMLRelationshipType = UMLRelationshipType.SfcTransition;
}
