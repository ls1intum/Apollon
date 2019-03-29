import { ActivityElementType } from '..';
import { Element } from '../../../services/element/element';
import { Boundary } from '../../../utils/geometry/boundary';

export class ActivityMergeNode extends Element {
  type = ActivityElementType.ActivityMergeNode;
  bounds: Boundary = { ...this.bounds, height: 60 };
}