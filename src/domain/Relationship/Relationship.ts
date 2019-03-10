import Element from './../Element';
import Port from '../Port';
import Boundary from '../geo/Boundary';

abstract class Relationship extends Element {
  readonly base: string = 'Relationship';

  sourceRole: string = '';
  sourceMultiplicity: string = '';
  targetRole: string = '';
  targetMultiplicity: string = '';

  get bounds(): Boundary {
    const x = Math.min(...this.path.map(point => point.x));
    const y = Math.min(...this.path.map(point => point.y));
    const width = Math.max(...this.path.map(point => point.x)) - x;
    const height = Math.max(...this.path.map(point => point.y)) - y;
    return { x, y, width, height };
  }
  set bounds(_: Boundary) {}

  path: { x: number; y: number }[] = [{ x: 0, y: 0 }, { x: 0, y: 0 }];

  constructor(name: string, public source: Port, public target: Port) {
    super(name);
  }
}

export default Relationship;
