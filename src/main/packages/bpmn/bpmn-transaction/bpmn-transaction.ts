import { BPMNElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElementType } from '../../uml-element-type';
import { UMLContainer } from '../../../services/uml-container/uml-container';

export class BPMNTransaction extends UMLContainer {
  type: UMLElementType = BPMNElementType.BPMNTransaction;

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
