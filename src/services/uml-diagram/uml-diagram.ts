import { DeepPartial } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { assign } from '../../utils/assign';
import { Boundary } from '../../utils/geometry/boundary';
import { IUMLContainer, UMLContainer } from '../uml-container/uml-container';
import { UMLElement } from '../uml-element/uml-element';

export interface IUMLDiagram extends IUMLContainer {
  type: UMLDiagramType;
  ownedRelationships: string[];
}

export class UMLDiagram extends UMLContainer implements IUMLDiagram {
  type = UMLDiagramType.ClassDiagram;
  ownedRelationships: string[] = [];
  bounds: Boundary = { ...this.bounds, width: 0, height: 0 };

  constructor(values?: DeepPartial<IUMLDiagram>) {
    super();
    assign<IUMLDiagram>(this, values);
  }

  render(ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    let width = 0;
    let height = 0;
    for (const element of ownedElements) {
      width = Math.max(Math.abs(element.bounds.x), Math.abs(element.bounds.x + element.bounds.width), width);
      height = Math.max(Math.abs(element.bounds.y), Math.abs(element.bounds.y + element.bounds.height), height);
    }

    const bounds = { x: -width, y: -height, width: width * 2, height: height * 2 };
    const resizedDiagram = new UMLDiagram({ ...this, bounds });
    return [resizedDiagram, ...ownedElements];
  }
}
