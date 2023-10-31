import { BPMNElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { calculateNameBounds } from '../../../utils/name-bounds';
import { UMLElementType } from '../../uml-element-type';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLContainer } from '../../../services/uml-container/uml-container';

export class BPMNDataObject extends UMLContainer {
  static features: UMLElementFeatures = { ...UMLContainer.features };

  type: UMLElementType = BPMNElementType.BPMNDataObject;

  render(canvas: ILayer): ILayoutable[] {
    this.bounds = calculateNameBounds(this, canvas);
    return [this];
  }
}
