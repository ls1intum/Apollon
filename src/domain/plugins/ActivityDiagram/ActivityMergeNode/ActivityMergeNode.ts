import { Element } from '../../../Element';
import { ElementType } from '..';
import Boundary from '../../../geo/Boundary';

class ActivityMergeNode extends Element {
  type = ElementType.ActivityMergeNode;
  bounds: Boundary = { ...this.bounds, height: 60 };
}

export default ActivityMergeNode;
