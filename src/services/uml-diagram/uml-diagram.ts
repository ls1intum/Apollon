import { DiagramType } from '../../packages/diagram-type';
import { UMLElementType } from '../../packages/uml-element-type';
import { Boundary } from '../../utils/geometry/boundary';
import { IUMLContainer, UMLContainer } from '../uml-container/uml-container';
import { IUMLElement } from '../uml-element/uml-element';

export interface IUMLDiagram extends IUMLContainer {
  type2: DiagramType;
  ownedRelationships: string[];
}

export class UMLDiagram extends UMLContainer implements IUMLDiagram {
  type: UMLElementType = UMLElementType.Diagram;
  type2: DiagramType = DiagramType.ClassDiagram;
  ownedElements: string[] = [];
  ownedRelationships: string[] = [];

  bounds: Boundary = {
    ...this.bounds,
    width: 800,
    height: 300,
  };

  constructor(values?: IUMLDiagram | IUMLElement) {
    super(values);
    Object.assign(this, values);
  }
}
