import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { Text } from '../../../utils/svg/text';

export abstract class NamedElement extends UMLElement {
  render(layer: ILayer): ILayoutable[] {
    this.bounds.width = Math.max(this.bounds.width, Text.width(layer, this.name));
    return [this];
  }
}
