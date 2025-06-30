import { SfcContainer } from '../base/sfc-container';
import { UMLElementType } from '../../uml-element-type';
import { SfcElementType } from '../index';
import { Text } from '../../../utils/svg/text';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { ILayer } from '../../../services/layouter/layer';

/**
 * Represents an action table in a sfc.
 * Contains rows of actions with identifiers and descriptions.
 */
export class SfcActionTable extends SfcContainer {
  type: UMLElementType = SfcElementType.SfcActionTable;
  override minHeight = 30;

  override childWidthCalculation: (canvas: ILayer, child: UMLElement) => number = (canvas, child) => {
    const parsedValues = JSON.parse((child as UMLElement).name);
    return Text.size(canvas, parsedValues[1] ?? 0, { fontWeight: 'normal' }).width + 50;
  };
}
