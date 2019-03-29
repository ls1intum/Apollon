import { UseCaseElementType } from '..';
import { Element } from '../../../services/element/element';
import { Boundary } from '../../../utils/geometry/boundary';

export class UseCaseActor extends Element {
  type = UseCaseElementType.UseCaseActor;
  bounds: Boundary = { ...this.bounds, width: 90, height: 140 };
}
