import { DeepPartial } from 'redux';
import { ComponentElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { assign } from '../../../utils/fx/assign';

export class ComponentInterface extends UMLElement {
  static features = { ...UMLElement.features, resizable: true };

  type = ComponentElementType.ComponentInterface;

  constructor(values?: DeepPartial<IUMLElement>) {
    super();
    assign<IUMLElement>(this, { ...values, bounds: { ...this.bounds, width: 20, height: 20 }});
  }

  render(layer: ILayer): ILayoutable[] {
    return [this];
  }
}
