import { StateElementType, StateRelationshipType } from '..';
import { UMLPackage } from '../../common/uml-package/uml-package';

export class UMLState extends UMLPackage {
  static supportedRelationships = [StateRelationshipType.StateControlFlow];
  type = StateElementType.State;
} 