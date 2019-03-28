import { Element } from '../../../services/element/element';
import { ActivityElementType } from '..';
import { Boundary } from '../../../utils/geometry/boundary';

export class ActivityMergeNode extends Element {
  type = ActivityElementType.ActivityMergeNode;
  bounds: Boundary = { ...this.bounds, height: 60 };
}