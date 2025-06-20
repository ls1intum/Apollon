import { SfcElement } from '../base/sfc-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { UMLElementType } from '../../uml-element-type';

export class SfcPreviewSpacer extends SfcElement {
  static features: UMLElementFeatures = {
    ...SfcElement.features,
    movable: false,
  };

  bounds = { x: 0, y: 0, width: 0, height: 0 };

  type = UMLElementType.SfcPreviewSpacer;
}
