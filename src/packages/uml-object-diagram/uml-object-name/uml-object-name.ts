import { ObjectElementType } from '..';
import { UMLClassifier } from '../../common/uml-classifier/uml-classifier';
import { UMLElementType } from '../../uml-element-type';
import { IUMLElement } from '../../../services/uml-element/uml-element';
import { UMLClassifierAttribute } from '../../common/uml-classifier/uml-classifier-attribute';
import { UMLClassifierMethod } from '../../common/uml-classifier/uml-classifier-method';

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
