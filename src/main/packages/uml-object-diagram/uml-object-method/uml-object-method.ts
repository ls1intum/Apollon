import { ObjectElementType } from '..';
import { UMLClassifierMethod } from '../../common/uml-classifier/uml-classifier-method';
import { UMLElementType } from '../../uml-element-type';

export class UMLObjectMethod extends UMLClassifierMethod {
  type: UMLElementType = ObjectElementType.ObjectMethod;
}
