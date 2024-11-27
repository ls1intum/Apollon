import { DeepPartial } from 'redux';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { assign } from '../../../utils/fx/assign';
import { IBoundary, computeDimension } from '../../../utils/geometry/boundary';
import { Text } from '../../../utils/svg/text';

export abstract class UMLStateMember extends UMLElement {
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

  bounds: IBoundary = { ...this.bounds, height: computeDimension(1.0, 30) };

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