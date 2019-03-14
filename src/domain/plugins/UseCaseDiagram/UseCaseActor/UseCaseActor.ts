import Element from '../../../Element';
import Boundary from '../../../geo/Boundary';
import { ElementKind } from '..';

class UseCaseActor extends Element {
  kind = ElementKind.UseCaseActor;
  bounds: Boundary = { ...this.bounds, width: 90, height: 140 }
}

export default UseCaseActor;
