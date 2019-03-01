import Element from './../Element';
import Port from '../Port';

abstract class Relationship extends Element {
  readonly base: string = 'Relationship';
  kind = 'Relationship';

  path: { x: number; y: number }[] = [];

  constructor(name: string, public source: Port, public target: Port) {
    super(name);
  }
}

export default Relationship;
