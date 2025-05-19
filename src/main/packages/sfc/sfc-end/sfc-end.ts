import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementType } from '../../uml-element-type';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { UMLContainer } from '../../../services/uml-container/uml-container';

export class SfcEnd extends UMLElement {
  type = UMLElementType.SfcEnd;
  static features: UMLElementFeatures = {
    ...UMLContainer.features,
    resizable: false,
    updatable: false,
  };

  render(canvas: ILayer): ILayoutable[] {
    this.bounds.width = 50;
    this.bounds.height = 50;
    return [this];
  }
}
