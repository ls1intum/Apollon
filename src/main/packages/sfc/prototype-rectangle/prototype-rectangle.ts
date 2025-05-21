import { SfcContainer } from '../base/SfcContainer';
import { UMLElementType } from '../../uml-element-type';
import { SfcElementType } from '../index';

export class PrototypeRectangle extends SfcContainer {
  type: UMLElementType = SfcElementType.PrototypeRectangle;

  protected override hasNameAtTop = true;
}
