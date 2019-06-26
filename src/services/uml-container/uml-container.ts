import { Apollon } from '@ls1intum/apollon';
import { DeepPartial } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { UMLElementType } from '../../packages/uml-element-type';
import { assign } from '../../utils/fx/assign';
import { ILayer } from '../layouter/layer';
import { ILayoutable } from '../layouter/layoutable';
import { IUMLElement, UMLElement } from '../uml-element/uml-element';
import { UMLElementFeatures } from '../uml-element/uml-element-features';

export interface IUMLContainer extends IUMLElement {
  type: UMLElementType | UMLDiagramType;
  ownedElements: string[];
}

export abstract class UMLContainer extends UMLElement implements IUMLContainer {
  static features: UMLElementFeatures = { ...UMLElement.features, droppable: true };

  abstract type: UMLElementType | UMLDiagramType;
  ownedElements: string[] = [];

  constructor(values?: DeepPartial<IUMLContainer>) {
    super();
    assign<IUMLContainer>(this, values);
  }

  deserialize<T extends Apollon.UMLElement>(values: T, children: Apollon.UMLElement[] = []) {
    super.deserialize(values);
    this.ownedElements = children.map(child => child.id);
  }

  abstract appendElements(elements: UMLElement[], ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]];

  abstract removeElements(elements: UMLElement[], ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]];

  abstract render(canvas: ILayer, children?: ILayoutable[]): ILayoutable[];

  // appendElements(elements: UMLElement[], ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
  //   return [this, ...[...elements, ...ownedElements]];
  // }

  // removeElements(elements: UMLElement[], ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
  //   return [this, ...ownedElements];
  // }

  // render(ownedElements?: UMLElement[]): [UMLContainer, ...UMLElement[]] {
  //   return [this, ...ownedElements];
  // }
}
