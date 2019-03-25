import Element from '../../../Element';
import { ElementKind } from '..';
import Boundary from '../../../geo/Boundary';

class ActivityForkNode extends Element {
  static features = { ...Element.features, editable: false };

  type = ElementKind.ActivityForkNode;
  bounds: Boundary = { ...this.bounds, width: 20, height: 60 };
}

export default ActivityForkNode;
