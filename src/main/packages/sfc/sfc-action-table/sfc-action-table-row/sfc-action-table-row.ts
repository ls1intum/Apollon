import { UMLElementType } from '../../../uml-element-type';
import { SfcElement } from '../../base/sfc-element';
import { UMLElementFeatures } from '../../../../services/uml-element/uml-element-features';

/**
 * Represents a row in an action table in a sfc.
 * Contains an action identifier and description.
 */
export class SfcActionTableRow extends SfcElement {
  static features: UMLElementFeatures = {
    ...SfcElement.features,
    connectable: false,
    hoverable: false,
  };
  bounds = { x: 0, y: 0, width: 0, height: 30 };
  type: UMLElementType = UMLElementType.SfcActionTableRow;
}
