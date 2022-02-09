import { UseCaseElementType } from '..';
import { UMLContainer } from '../../../services/uml-container/uml-container.js';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features.js';
import { UMLPackage } from '../../common/uml-package/uml-package.js';
import { UMLElementType } from '../../uml-element-type.js';

export class UMLUseCaseSystem extends UMLPackage {
  static features: UMLElementFeatures = { ...UMLContainer.features, connectable: false };

  type: UMLElementType = UseCaseElementType.UseCaseSystem;
}
