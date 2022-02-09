import { DeepPartial } from 'redux';
import { ILayer } from '../../../services/layouter/layer.js';
import { ILayoutable } from '../../../services/layouter/layoutable.js';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element.js';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features.js';
import { assign } from '../../../utils/fx/assign.js';
import { IBoundary } from '../../../utils/geometry/boundary.js';
import { Text } from '../../../utils/svg/text.js';

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

  constructor(values?: DeepPartial<IUMLElement>) {
    super(values);
    assign<IUMLElement>(this, values);
  }

  render(layer: ILayer): ILayoutable[] {
    const radix = 10;
    const width = Text.size(layer, this.name).width + 20;
    this.bounds.width = Math.max(this.bounds.width, Math.round(width / radix) * radix);
    return [this];
  }
}
