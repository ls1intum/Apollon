import { ObjectElementType } from '..';
import { UMLClassifier } from '../../common/uml-classifier/uml-classifier';
import { UMLElementType } from '../../uml-element-type';

export class UMLObjectName extends UMLClassifier {
  type: UMLElementType = ObjectElementType.ObjectName;
  underline: boolean = true;
}
