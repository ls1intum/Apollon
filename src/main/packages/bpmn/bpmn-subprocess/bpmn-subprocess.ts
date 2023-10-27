import { BPMNElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { calculateNameBounds } from '../../../utils/name-bounds';
import { UMLElementType } from '../../uml-element-type';
import { UMLContainer } from '../../../services/uml-container/uml-container';

export class BPMNSubprocess extends UMLContainer {
  type: UMLElementType = BPMNElementType.BPMNSubprocess;

  render(canvas: ILayer): ILayoutable[] {
    this.bounds = calculateNameBounds(this, canvas);
    return [this];
  }
}
