import { ObjectElementType } from '..';
import { UMLClassifierMethod } from '../../common/uml-classifier/uml-classifier-method.js';
import { UMLElementType } from '../../uml-element-type.js';

export class UMLObjectMethod extends UMLClassifierMethod {
  type: UMLElementType = ObjectElementType.ObjectMethod;
}
