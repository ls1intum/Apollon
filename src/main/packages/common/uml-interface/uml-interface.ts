import { DeepPartial } from 'redux';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { assign } from '../../../utils/fx/assign';

export abstract class UMLInterface extends UMLElement {
  static features = { ...UMLElement.features, resizable: false, alternativePortVisualization: true };

  constructor(values?: DeepPartial<UMLInterface>) {
    super(values);
    assign<UMLInterface>(this, values);
    this.bounds = { ...this.bounds, width: values?.bounds?.width ?? 20, height: values?.bounds?.height ?? 20 };
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
