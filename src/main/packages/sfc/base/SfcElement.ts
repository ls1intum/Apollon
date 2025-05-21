import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { DeepPartial } from 'redux';
import { assign } from '../../../utils/fx/assign';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { computeDimension, IBoundary } from '../../../utils/geometry/boundary';

export abstract class SfcElement extends UMLElement {
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

  bounds: IBoundary = { x: 0, y: 0, width: 0, height: computeDimension(1.0, 30) };

  constructor(values?: DeepPartial<IUMLElement>) {
    super(values);
    assign<IUMLElement>(this, values);
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
