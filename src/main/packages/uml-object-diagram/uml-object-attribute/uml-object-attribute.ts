import { ObjectElementType } from '..';
import { UMLClassifierAttribute } from '../../common/uml-classifier/uml-classifier-attribute';
import { UMLElementType } from '../../uml-element-type';

export class UMLObjectAttribute extends UMLClassifierAttribute {
  type: UMLElementType = ObjectElementType.ObjectAttribute;
}
