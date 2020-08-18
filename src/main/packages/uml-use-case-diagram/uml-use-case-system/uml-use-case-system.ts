import { UseCaseElementType } from '..';
import { UMLContainer } from '../../../services/uml-container/uml-container';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { UMLPackage } from '../../common/uml-package/uml-package';
import { UMLElementType } from '../../uml-element-type';

export class UMLUseCaseSystem extends UMLPackage {
  static features: UMLElementFeatures = { ...UMLContainer.features, connectable: false };

  type: UMLElementType = UseCaseElementType.UseCaseSystem;
}
