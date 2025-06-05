import { UMLElementType } from '../../uml-element-type';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { SfcContainer } from '../base/sfc-container';
import { Text } from '../../../utils/svg/text';

export class SfcJump extends SfcContainer {
  type = UMLElementType.SfcJump;

  render(canvas: ILayer): ILayoutable[] {
    this.bounds.height = 20;
    this.bounds.width = Text.size(canvas, this.name, { fontWeight: 'bold' }).width + 50;
    return [this];
  }
}
