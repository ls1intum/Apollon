import Element from '../../../Element';
import { ElementKind } from '..';
import Boundary from '../../../geo/Boundary';

class ActivityFinalNode extends Element {
  static features = { ...Element.features, editable: false };

  type = ElementKind.ActivityFinalNode;
  bounds: Boundary = { ...this.bounds, width: 45, height: 45 };
}

export default ActivityFinalNode;
