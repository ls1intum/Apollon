import Element from '../../../Element';
import Boundary from '../../../geo/Boundary';
import { ElementKind } from '..';

class Actor extends Element {
  kind = ElementKind.Actor;
  bounds: Boundary = { ...this.bounds, width: 90, height: 140 }
}

export default Actor;
