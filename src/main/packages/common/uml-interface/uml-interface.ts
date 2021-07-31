import { DeepPartial } from 'redux';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { assign } from '../../../utils/fx/assign';
import { IBoundary } from '../../../utils/geometry/boundary';

export abstract class UMLInterface extends UMLElement {
  static features = { ...UMLElement.features, resizable: false, alternativePortVisualization: true };

  bounds: IBoundary = { ...this.bounds, width: 20, height: 20 };

  constructor(values?: DeepPartial<UMLInterface>) {
    super(values);
    assign<UMLInterface>(this, values);
  }

  render(layer: ILayer): ILayoutable[] {
    return [this];
    // const radix = 10;
    // const bounds = Text.size(layer, this.name, { fontWeight: 'bold' });
    // this.bounds.width = Math.round((bounds.width + 20) / radix) * radix;
    // this.bounds.height = Math.round((bounds.height + 20) / radix) * radix;
    // return [this];
  }
}
