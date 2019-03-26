import { Element } from '../../../Element';
import Boundary from '../../../geo/Boundary';
import { ElementType } from '..';

class UseCaseActor extends Element {
  type = ElementType.UseCaseActor;
  bounds: Boundary = { ...this.bounds, width: 90, height: 140 }
}

export default UseCaseActor;
