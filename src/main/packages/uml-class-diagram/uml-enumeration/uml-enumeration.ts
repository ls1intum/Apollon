import { ClassElementType } from '..';
import { UMLClassifier } from '../../common/uml-classifier/uml-classifier.js';
import { UMLElementType } from '../../uml-element-type.js';
import { IUMLElement } from '../../../services/uml-element/uml-element.js';
import { UMLClassifierAttribute } from '../../common/uml-classifier/uml-classifier-attribute.js';
import { UMLClassifierMethod } from '../../common/uml-classifier/uml-classifier-method.js';

export class UMLEnumeration extends UMLClassifier {
  type: UMLElementType = ClassElementType.Enumeration;
  stereotype: string | null = 'enumeration';

  reorderChildren(children: IUMLElement[]): string[] {
    const attributes = children.filter((x): x is UMLClassifierAttribute => x.type === ClassElementType.ClassAttribute);
    const methods = children.filter((x): x is UMLClassifierMethod => x.type === ClassElementType.ClassMethod);
    return [...attributes.map((element) => element.id), ...methods.map((element) => element.id)];
  }
}
