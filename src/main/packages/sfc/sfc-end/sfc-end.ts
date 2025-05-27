import { UMLElementType } from '../../uml-element-type';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { SfcElement } from '../base/SfcElement';

export class SfcEnd extends SfcElement {
  type = UMLElementType.SfcEnd;

  render(canvas: ILayer): ILayoutable[] {
    this.bounds.width = 50;
    this.bounds.height = 50;
    return [this];
  }
}
