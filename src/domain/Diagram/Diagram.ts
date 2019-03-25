import Container from './../Container';
import Boundary from './../geo/Boundary';
import { ElementKind } from '../Element';
import { DiagramType } from './../plugins/DiagramType';
import { IContainer } from '../Container/Container';

export interface IDiagram extends IContainer {
  type2: DiagramType;
  ownedRelationships: string[];
}

export class Diagram extends Container implements IDiagram {
  type: ElementKind = ElementKind.Diagram;
  type2: DiagramType = DiagramType.ClassDiagram;
  ownedElements: string[] = [];
  ownedRelationships: string[] = [];

  bounds: Boundary = {
    ...this.bounds,
    width: 1600,
    height: 1600,
  };

  constructor(values?: Partial<IDiagram>) {
    super(values);
    Object.assign(this, values);
  }
}

// class Diagram extends Container {
//   readonly type: ElementKind = ElementKind.Diagram;

//   bounds: Boundary = {
//     ...this.bounds,
//     width: 1600,
//     height: 1600,
//   };
//   type2: DiagramType = DiagramType.ClassDiagram;

//   ownedElements: string[] = [];
//   ownedRelationships: string[] = [];

//   constructor(values?: Partial<IDiagram>) {
//     super(values);
//   }
// }

// export default Diagram;
