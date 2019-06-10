import { DeepPartial } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { assign } from '../../utils/fx/assign';
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

  appendElements(elements: UMLElement[], ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    return this.resize([...elements, ...ownedElements]);
  }

  removeElements(elements: UMLElement[], ownedElements: UMLContainer[]): [UMLContainer, ...UMLElement[]] {
    return this.resize(ownedElements);
  }

  resize(ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    const scale = 2;
    const size = ownedElements.reduce<{ width: number; height: number }>(
      (max, element) => ({
        width: Math.max(Math.abs(element.bounds.x), Math.abs(element.bounds.x + element.bounds.width), max.width),
        height: Math.max(Math.abs(element.bounds.y), Math.abs(element.bounds.y + element.bounds.height), max.height),
      }),
      { width: 0, height: 0 },
    );

    const bounds = { x: -size.width, y: -size.height, width: size.width * scale, height: size.height * scale };

    return [new UMLDiagram({ ...this, bounds })];
  }
}
