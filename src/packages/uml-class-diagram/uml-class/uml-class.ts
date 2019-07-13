import { ClassElementType } from '..';
import { UMLClassifier } from '../../common/uml-classifier/uml-classifier';
import { UMLElementType } from '../../uml-element-type';

export class UMLClass extends UMLClassifier {
  type: UMLElementType = ClassElementType.Class;
}
