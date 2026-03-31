import { UMLElementType } from '../../uml-element-type';
import { SfcElement } from '../base/sfc-element';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';

/**
 * Represents a transition branch in a sfc.
 * A junction point where multiple transitions can converge or diverge.
 */
export class SfcTransitionBranch extends SfcElement {
  type = UMLElementType.SfcTransitionBranch;

  padding = 15;

  render(canvas: ILayer): ILayoutable[] {
    this.bounds.width = 20 + (this.padding * 2);
    this.bounds.height = 20 + (this.padding * 2);

    return [this];
  }
}
