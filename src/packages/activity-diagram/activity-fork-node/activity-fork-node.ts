import { ActivityElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { IBoundary } from '../../../utils/geometry/boundary';
import { UMLElementType } from '../../uml-element-type';

export class ActivityForkNode extends UMLElement {
  static features: UMLElementFeatures = { ...UMLElement.features, updatable: false };

  type: UMLElementType = ActivityElementType.ActivityForkNode;
  bounds: IBoundary = { ...this.bounds, width: 20, height: 60 };

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
