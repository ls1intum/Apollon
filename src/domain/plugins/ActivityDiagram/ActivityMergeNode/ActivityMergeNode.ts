import Element from '../../../Element';
import { ElementKind } from '..';
import Boundary from '../../../geo/Boundary';

class ActivityMergeNode extends Element {
  type = ElementKind.ActivityMergeNode;
  bounds: Boundary = { ...this.bounds, height: 60 };
}

export default ActivityMergeNode;
