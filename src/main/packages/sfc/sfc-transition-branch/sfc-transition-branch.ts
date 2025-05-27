import { UMLElementType } from '../../uml-element-type';
import { SfcElement } from '../base/SfcElement';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';

export class SfcTransitionBranch extends SfcElement {
  type = UMLElementType.SfcTransitionBranch;

  render(canvas: ILayer): ILayoutable[] {
    this.bounds.width = 20;
    this.bounds.height = 20;
    return [this];
  }
}
