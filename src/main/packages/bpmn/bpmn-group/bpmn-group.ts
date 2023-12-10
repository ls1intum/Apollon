import { BPMNElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLPackage } from '../../common/uml-package/uml-package';
import { UMLElementType } from '../../uml-element-type';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';

export class BPMNGroup extends UMLPackage {
  static features: UMLElementFeatures = {
    ...UMLPackage.features,
    connectable: false,
  };

  type: UMLElementType = BPMNElementType.BPMNGroup;

  render(canvas: ILayer, children: ILayoutable[] = []): ILayoutable[] {
    return [this, ...children];
  }
}
