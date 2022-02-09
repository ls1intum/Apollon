import { ObjectElementType } from '..';
import { UMLClassifierAttribute } from '../../common/uml-classifier/uml-classifier-attribute.js';
import { UMLElementType } from '../../uml-element-type.js';

export class UMLObjectAttribute extends UMLClassifierAttribute {
  type: UMLElementType = ObjectElementType.ObjectAttribute;
}
