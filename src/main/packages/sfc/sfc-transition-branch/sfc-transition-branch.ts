import { UMLElementType } from '../../uml-element-type';
import { SfcElement } from '../base/SfcElement';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { UMLContainer } from '../../../services/uml-container/uml-container';

export class SfcTransitionBranch extends SfcElement {
  type = UMLElementType.SfcTransitionBranch;

  static features: UMLElementFeatures = {
    ...UMLContainer.features,
    resizable: false,
    updatable: false,
  };

  render(canvas: ILayer): ILayoutable[] {
    this.bounds.width = 20;
    this.bounds.height = 20;
    return [this];
  }
}
