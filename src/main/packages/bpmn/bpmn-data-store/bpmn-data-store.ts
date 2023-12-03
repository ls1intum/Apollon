import { BPMNElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElementType } from '../../uml-element-type';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { UMLContainer } from '../../../services/uml-container/uml-container';

export class BPMNDataStore extends UMLContainer {
  static features: UMLElementFeatures = { ...UMLContainer.features, resizable: false };

  type: UMLElementType = BPMNElementType.BPMNDataStore;

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
