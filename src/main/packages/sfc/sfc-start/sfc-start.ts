import { UMLElementType } from '../../uml-element-type';
import { ScfContainer } from '../base/SfcContainer';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { UMLContainer } from '../../../services/uml-container/uml-container';

export class SfcStart extends ScfContainer {
  static features: UMLElementFeatures = {
    ...UMLContainer.features,
    updatable: false,
  };

  type = UMLElementType.SfcStart;
}
