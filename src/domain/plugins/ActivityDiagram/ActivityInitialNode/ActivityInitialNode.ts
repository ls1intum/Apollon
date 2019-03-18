import Element from '../../../Element';
import { ElementKind } from '..';
import Boundary from '../../../geo/Boundary';

class ActivityInitialNode extends Element {
  kind = ElementKind.ActivityInitialNode;
  bounds: Boundary = { ...this.bounds, width: 45, height: 45 };
}

export default ActivityInitialNode;
