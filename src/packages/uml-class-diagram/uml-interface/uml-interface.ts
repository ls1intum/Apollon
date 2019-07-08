import { ClassElementType } from '..';
import { UMLClassifier } from '../../common/uml-classifier/uml-classifier';
import { UMLElementType } from '../../uml-element-type';

export class UMLInterface extends UMLClassifier {
  type: UMLElementType = ClassElementType.Interface;
  stereotype: string | null = 'interface';
}
