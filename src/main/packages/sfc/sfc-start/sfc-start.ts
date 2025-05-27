import { UMLElementType } from '../../uml-element-type';
import { SfcContainer } from '../base/SfcContainer';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';

export class SfcStart extends SfcContainer {
  static features: UMLElementFeatures = {
    ...SfcContainer.features,
    updatable: false,
  };

  type = UMLElementType.SfcStart;
}
