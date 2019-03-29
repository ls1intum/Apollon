import { ActivityElementType } from '..';
import { Element } from '../../../services/element/element';
import { Boundary } from '../../../utils/geometry/boundary';

export class ActivityInitialNode extends Element {
  static features = { ...Element.features, editable: false };

  type = ActivityElementType.ActivityInitialNode;
  bounds: Boundary = { ...this.bounds, width: 45, height: 45 };
}
