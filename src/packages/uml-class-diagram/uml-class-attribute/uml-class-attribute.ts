import { ClassElementType } from '..';
import { UMLClassifierAttribute } from '../../common/uml-classifier/uml-classifier-attribute';
import { UMLElementType } from '../../uml-element-type';

export class UMLClassAttribute extends UMLClassifierAttribute {
  type: UMLElementType = ClassElementType.ClassAttribute;
}
