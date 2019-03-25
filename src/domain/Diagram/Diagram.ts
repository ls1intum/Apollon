import Container from './../Container';
import Boundary from './../geo/Boundary';
import { ElementKind, IElement } from '../Element';
import { DiagramType } from './../plugins/DiagramType';

interface IDiagram extends IElement {
  type2: DiagramType;
}

class Diagram extends Container {
  readonly type: ElementKind = ElementKind.Diagram;

  bounds: Boundary = {
    ...this.bounds,
    width: 1600,
    height: 1600,
  };
  public type2: DiagramType = DiagramType.ClassDiagram;

  ownedElements: string[] = [];
  ownedRelationships: string[] = [];

  constructor(values?: Partial<IDiagram>) {
    super(values);
  }
}

export default Diagram;
