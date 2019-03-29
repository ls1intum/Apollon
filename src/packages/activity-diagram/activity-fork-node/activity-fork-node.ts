import { ActivityElementType } from '..';
import { Element } from '../../../services/element/element';
import { Boundary } from '../../../utils/geometry/boundary';

export class ActivityForkNode extends Element {
  static features = { ...Element.features, editable: false };

  type = ActivityElementType.ActivityForkNode;
  bounds: Boundary = { ...this.bounds, width: 20, height: 60 };
}
