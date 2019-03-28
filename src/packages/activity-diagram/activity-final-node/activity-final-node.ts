import { Element } from '../../../services/element/element';
import { ActivityElementType } from '..';
import { Boundary } from '../../../utils/geometry/boundary';

export class ActivityFinalNode extends Element {
  static features = { ...Element.features, editable: false };

  type = ActivityElementType.ActivityFinalNode;
  bounds: Boundary = { ...this.bounds, width: 45, height: 45 };
}
