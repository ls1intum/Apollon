import Container from './../Container';
import Boundary from './../geo/Boundary';
import { ElementType, IElement } from '../../services/element';
import { DiagramType } from './../plugins/DiagramType';
import { IContainer } from '../Container/Container';
import { UMLElement } from '../..';

export interface IDiagram extends IContainer {
  type2: DiagramType;
  ownedRelationships: string[];
}

export class Diagram extends Container implements IDiagram {
  type: ElementType = ElementType.Diagram;
  type2: DiagramType = DiagramType.ClassDiagram;
  ownedElements: string[] = [];
  ownedRelationships: string[] = [];

  bounds: Boundary = {
    ...this.bounds,
    width: 1600,
    height: 1600,
  };

  constructor(values: DiagramType);
  constructor(values?: UMLElement);
  constructor(values?: IElement);
  constructor(values?: UMLElement | IElement);
  constructor(values?: DiagramType | UMLElement | IElement) {
    super();

    if (values && typeof values === 'string') {
      this.type2 = values;
    }
    this.bounds = {
      ...this.bounds,
      width: 1600,
      height: 1600,
    }
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
