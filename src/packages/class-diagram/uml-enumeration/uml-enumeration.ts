import { ClassElementType } from '..';
import { UMLClassifier } from '../../common/uml-classifier/uml-classifier';
import { UMLElementType } from '../../uml-element-type';

export class UMLEnumeration extends UMLClassifier {
  type: UMLElementType = ClassElementType.Enumeration;
  stereotype: string | null = 'enumeration';
}
