import { UMLElementType } from '../../uml-element-type';
import { SfcContainer } from '../base/sfc-container';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';

/**
 * Represents a start element in a sfc.
 */
export class SfcStart extends SfcContainer {
  static features: UMLElementFeatures = {
    ...SfcContainer.features,
    updatable: false,
  };

  type = UMLElementType.SfcStart;
}
