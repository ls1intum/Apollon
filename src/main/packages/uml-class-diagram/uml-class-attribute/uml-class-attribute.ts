import { ClassElementType } from '..';
import { UMLClassifierAttribute } from '../../common/uml-classifier/uml-classifier-attribute.js';
import { UMLElementType } from '../../uml-element-type.js';

export class UMLClassAttribute extends UMLClassifierAttribute {
  type: UMLElementType = ClassElementType.ClassAttribute;
}
