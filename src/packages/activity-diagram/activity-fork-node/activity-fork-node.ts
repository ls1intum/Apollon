import { Element } from '../../../services/element/element';
import { ActivityElementType } from '..';
import { Boundary } from '../../../utils/geometry/boundary';

export class ActivityForkNode extends Element {
  static features = { ...Element.features, editable: false };

  type = ActivityElementType.ActivityForkNode;
  bounds: Boundary = { ...this.bounds, width: 20, height: 60 };
}

export default ActivityForkNode;
