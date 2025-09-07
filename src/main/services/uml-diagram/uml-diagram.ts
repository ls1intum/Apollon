import { DeepPartial } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { assign } from '../../utils/fx/assign';
import { ILayer } from '../layouter/layer';
import { ILayoutable } from '../layouter/layoutable';
import { IUMLContainer, UMLContainer } from '../uml-container/uml-container';

export const DIAGRAM_MARGIN = 40;

export interface IUMLDiagram extends IUMLContainer {
  type: UMLDiagramType;
  ownedRelationships: string[];
}

export class UMLDiagram extends UMLContainer implements IUMLDiagram {
  type: UMLDiagramType = UMLDiagramType.ClassDiagram;
  ownedRelationships: string[] = [];

  constructor(values?: DeepPartial<IUMLDiagram>) {
    super();
    assign<IUMLDiagram>(this, values);
    this.bounds = { ...this.bounds, width: values?.bounds?.width ?? 0, height: values?.bounds?.height ?? 0 };
  }

  render(canvas: ILayer, children: ILayoutable[] = []): ILayoutable[] {
    // calculates the most distant svg point from diagram center
    const size = children.reduce<{ width: number; height: number }>(
      (max, element) => ({
        width: Math.max(Math.abs(element.bounds.x), Math.abs(element.bounds.x + element.bounds.width), max.width),
        height: Math.max(Math.abs(element.bounds.y), Math.abs(element.bounds.y + element.bounds.height), max.height),
      }),
      { width: 0, height: 0 },
    );

    // updates diagram bound
    // sets origin to new location
    // make size at least 2 times most distant point -> all points are inside the diagram
    this.bounds = {
      x: -size.width - DIAGRAM_MARGIN,
      y: -size.height - DIAGRAM_MARGIN,
      width: size.width * 2 + DIAGRAM_MARGIN,
      height: size.height * 2 + DIAGRAM_MARGIN,
    };
    return [this];
  }
}
