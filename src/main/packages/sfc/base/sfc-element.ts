import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLContainer } from '../../../services/uml-container/uml-container';

export abstract class SfcElement extends UMLElement {
  static features: UMLElementFeatures = {
    ...UMLContainer.features,
    resizable: false,
    updatable: false,
  };

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
