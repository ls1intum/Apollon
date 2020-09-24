import { ComponentElementType, ComponentRelationshipType } from '..';
import { UMLElementType } from '../../uml-element-type';
import { UMLInterface } from '../../common/uml-interface/uml-interface';

export class UMLComponentInterface extends UMLInterface {
  static supportedRelationships = [
    ComponentRelationshipType.ComponentInterfaceProvided,
    ComponentRelationshipType.ComponentInterfaceRequired,
  ];
  type: UMLElementType = ComponentElementType.ComponentInterface;
}
