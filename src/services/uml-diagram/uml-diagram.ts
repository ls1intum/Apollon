import { DeepPartial } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { assign } from '../../utils/fx/assign';
import { computeBoundingBoxForElements, IBoundary } from '../../utils/geometry/boundary';
import { ILayer } from '../layouter/layer';
import { ILayoutable } from '../layouter/layoutable';
import { IUMLContainer, UMLContainer } from '../uml-container/uml-container';
import { UMLElement } from '../uml-element/uml-element';

export interface IUMLDiagram extends IUMLContainer {
  type: UMLDiagramType;
  ownedRelationships: string[];
}

export class UMLDiagram extends UMLContainer implements IUMLDiagram {
  type = UMLDiagramType.ClassDiagram;
  ownedRelationships: string[] = [];
  bounds: IBoundary = { ...this.bounds, width: 0, height: 0 };

  constructor(values?: DeepPartial<IUMLDiagram>) {
    super();
    assign<IUMLDiagram>(this, values);
  }

  appendElements(elements: UMLElement[], ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    return [this];
  }

  removeElements(elements: UMLElement[], ownedElements: UMLContainer[]): [UMLContainer, ...UMLElement[]] {
    return [this];
  }

  render(canvas: ILayer, children: ILayoutable[] = []): ILayoutable[] {
    this.bounds = computeBoundingBoxForElements(children);
    return [this];
  }
}
