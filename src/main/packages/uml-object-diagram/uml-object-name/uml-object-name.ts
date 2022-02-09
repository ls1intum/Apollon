import { ObjectElementType } from '..';
import { UMLClassifier } from '../../common/uml-classifier/uml-classifier.js';
import { UMLElementType } from '../../uml-element-type.js';
import { IUMLElement } from '../../../services/uml-element/uml-element.js';
import { UMLClassifierAttribute } from '../../common/uml-classifier/uml-classifier-attribute.js';
import { UMLClassifierMethod } from '../../common/uml-classifier/uml-classifier-method.js';

export class UMLObjectName extends UMLClassifier {
  type: UMLElementType = ObjectElementType.ObjectName;
  underline: boolean = true;

  reorderChildren(children: IUMLElement[]): string[] {
    const attributes = children.filter(
      (x): x is UMLClassifierAttribute => x.type === ObjectElementType.ObjectAttribute,
    );
    const methods = children.filter((x): x is UMLClassifierMethod => x.type === ObjectElementType.ObjectMethod);
    return [...attributes.map((element) => element.id), ...methods.map((element) => element.id)];
  }
}
