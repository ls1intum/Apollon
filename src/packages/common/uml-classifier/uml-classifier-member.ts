import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { IBoundary } from '../../../utils/geometry/boundary';
import { Text } from '../../../utils/svg/text';

export abstract class UMLClassifierMember extends UMLElement {
  static features: UMLElementFeatures = {
    ...UMLElement.features,
    hoverable: false,
    selectable: false,
    movable: false,
    resizable: false,
    connectable: false,
    droppable: false,
    updatable: false,
  };

  bounds: IBoundary = { ...this.bounds, height: 30 };

  render(layer: ILayer): ILayoutable[] {
    const radix = 10;
    const width = Text.width(layer, this.name) + 20;
    this.bounds.width = Math.max(this.bounds.width, Math.round(width / radix) * radix);
    return [this];
  }
}
