import { UMLElementType } from '../../uml-element-type';
import { UMLContainer } from '../../../services/uml-container/uml-container';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { PrototypeElementType } from '../index';

export class PrototypeRectangle extends UMLContainer {
  render(canvas: ILayer, children?: ILayoutable[] | undefined): ILayoutable[] {
    return [this, ...(children ?? [])];
  }

  type: UMLElementType = PrototypeElementType.PrototypeRectangle;
}
