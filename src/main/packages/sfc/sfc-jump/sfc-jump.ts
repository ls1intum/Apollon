import { UMLElementType } from '../../uml-element-type';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { SfcContainer } from '../base/sfc-container';
import { Text } from '../../../utils/svg/text';

/**
 * Represents a jump element in a sfc.
 */
export class SfcJump extends SfcContainer {
  type = UMLElementType.SfcJump;

  render(canvas: ILayer): ILayoutable[] {
    this.bounds.height = 20;

    // TODO: Find reason why this fix is necessary
    // Sometimes, Text.size returns 0, screwing with the text alignment due to false width
    const textWidth = Text.size(canvas, this.name, { fontWeight: 'bold' }).width;
    this.bounds.width = textWidth > 0 ? textWidth + 50 : this.bounds.width;

    return [this];
  }
}
