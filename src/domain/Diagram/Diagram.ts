import Container from './../Container';
import Boundary from './../geo/Boundary';

class Diagram extends Container {
  bounds: Boundary = {
    ...this.bounds,
    width: 1600,
    height: 800,
  };

  ownedElements: string[] = [];
  ownedRelationships: string[] = [];

  constructor() {
    super('');
  }
}

export default Diagram;
