import Container from './../Container';
import Boundary from './../geo/Boundary';
import { DiagramType } from './DiagramTypes';
import Element from '../Element';

class Diagram extends Container {
  bounds: Boundary = {
    ...this.bounds,
    width: 1600,
    height: 800,
  };

  ownedElements: string[] = [];
  ownedRelationships: string[] = [];

  constructor(public type: DiagramType) {
    super('');
  }
}

export default Diagram;
