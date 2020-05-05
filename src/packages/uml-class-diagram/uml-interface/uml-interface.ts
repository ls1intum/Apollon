import { ClassElementType } from '..';
import { UMLClassifier } from '../../common/uml-classifier/uml-classifier';
import { UMLElementType } from '../../uml-element-type';
import { IUMLElement } from '../../../services/uml-element/uml-element';
import { UMLClassifierAttribute } from '../../common/uml-classifier/uml-classifier-attribute';
import { UMLClassifierMethod } from '../../common/uml-classifier/uml-classifier-method';

export class UMLInterface extends UMLClassifier {
  type: UMLElementType = ClassElementType.Interface;
  stereotype: string | null = 'interface';

  reorderChildren(children: IUMLElement[]): string[] {
    const attributes = children.filter((x): x is UMLClassifierAttribute => x.type === ClassElementType.ClassAttribute);
    const methods = children.filter((x): x is UMLClassifierMethod => x.type === ClassElementType.ClassMethod);
    return [...attributes.map((element) => element.id), ...methods.map((element) => element.id)];
  }
}
