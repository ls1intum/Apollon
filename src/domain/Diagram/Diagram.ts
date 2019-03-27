import Container from './../Container';
import Boundary from './../geo/Boundary';
import { ElementKind } from '../Element';
import { DiagramType } from './../plugins/DiagramType';

class Diagram extends Container {
  readonly kind: ElementKind = ElementKind.Diagram;

  bounds: Boundary = {
    ...this.bounds,
    width: 1600,
    height: 1600,
  };

  ownedElements: string[] = [];
  ownedRelationships: string[] = [];

  constructor(public type: DiagramType) {
    super('');
  }
}

export default Diagram;
