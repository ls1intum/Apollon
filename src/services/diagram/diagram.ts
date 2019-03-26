import { Container, IContainer } from '../container';
import Boundary from '../../domain/geo/Boundary';
import { ElementType, IElement } from '../element';
import { DiagramType } from '../../domain/plugins/diagram-type';
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

  constructor(values?: IDiagram);
  constructor(values?: UMLElement);
  constructor(values?: UMLElement | IElement);
  constructor(values?: UMLElement | IDiagram) {
    super(values);
    Object.assign(this, values);
  }
}
