import { ClassElementType } from '..';
import { UMLClassifier } from '../../common/uml-classifier/uml-classifier';
import { UMLElementType } from '../../uml-element-type';

export class UMLAbstractClass extends UMLClassifier {
  type: UMLElementType = ClassElementType.AbstractClass;
  italic: boolean = true;
  stereotype: string | null = 'abstract';
}
