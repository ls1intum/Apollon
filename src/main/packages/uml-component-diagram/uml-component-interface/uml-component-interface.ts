import { ComponentElementType } from '..';
import { UMLElementType } from '../../uml-element-type';
import { UMLInterface } from '../../common/uml-interface/uml-interface';

export class UMLComponentInterface extends UMLInterface {
  type: UMLElementType = ComponentElementType.ComponentInterface;
}
