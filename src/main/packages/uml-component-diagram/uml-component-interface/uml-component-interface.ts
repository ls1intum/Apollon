import { ComponentElementType, ComponentRelationshipType } from '..';
import { UMLElementType } from '../../uml-element-type.js';
import { UMLInterface } from '../../common/uml-interface/uml-interface.js';

export class UMLComponentInterface extends UMLInterface {
  static supportedRelationships = [
    ComponentRelationshipType.ComponentInterfaceProvided,
    ComponentRelationshipType.ComponentInterfaceRequired,
  ];
  type: UMLElementType = ComponentElementType.ComponentInterface;
}
