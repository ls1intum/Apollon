import { BPMNElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementType } from '../../uml-element-type';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { IBoundary } from '../../../utils/geometry/boundary';

export class BPMNConversation extends UMLElement {
  static features: UMLElementFeatures = { ...UMLElement.features, resizable: false };

  type: UMLElementType = BPMNElementType.BPMNConversation;
  bounds: IBoundary = { ...this.bounds, width: 40, height: 40 };

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
