import Element from '../../../Element';
import { EntityKind } from '../../../../services/Interface/ExternalState';
import Boundary from '../../../geo/Boundary';

class Actor extends Element {
  kind = EntityKind.Actor;
  bounds: Boundary = { ...this.bounds, width: 90, height: 140 }
}

export default Actor;
