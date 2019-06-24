import { ActivityElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { IBoundary } from '../../../utils/geometry/boundary';
import { UMLElementType } from '../../uml-element-type';

export class ActivityInitialNode extends UMLElement {
  static features: UMLElementFeatures = { ...UMLElement.features, resizable: false, updatable: false };

  type: UMLElementType = ActivityElementType.ActivityInitialNode;
  bounds: IBoundary = { ...this.bounds, width: 45, height: 45 };

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
