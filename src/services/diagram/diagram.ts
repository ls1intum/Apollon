import { DiagramType } from '../../packages/diagram-type';
import { ElementType } from '../../packages/element-type';
import { UMLElement } from '../../typings';
import { Boundary } from '../../utils/geometry/boundary';
import { Container, IContainer } from '../container/container';
import { IElement } from '../element/element';

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
    width: 800,
    height: 300,
  };

  constructor(values?: IDiagram);
  constructor(values?: UMLElement);
  constructor(values?: UMLElement | IElement);
  constructor(values?: UMLElement | IDiagram) {
    super(values);
    Object.assign(this, values);
  }
}
