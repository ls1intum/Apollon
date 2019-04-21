import { UMLDiagramType } from '../../packages/diagram-type';
import { Boundary } from '../../utils/geometry/boundary';
import { IUMLContainer, UMLContainer } from '../uml-container/uml-container';
import { IUMLElement } from '../uml-element/uml-element';

export interface IUMLDiagram extends IUMLContainer {
  type: UMLDiagramType;
  ownedRelationships: string[];
}

export class UMLDiagram extends UMLContainer implements IUMLDiagram {
  type = UMLDiagramType.ClassDiagram;
  ownedElements: string[] = [];
  ownedRelationships: string[] = [];

  bounds: Boundary = {
    ...this.bounds,
    width: 800,
    height: 300,
  };

  // constructor(values?: IUMLDiagram | IUMLElement) {
  //   super(values);
  //   Object.assign(this, values);
  // }
}
