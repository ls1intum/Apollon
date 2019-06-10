import { DeepPartial } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { UMLElementType } from '../../packages/uml-element-type';
import { assign } from '../../utils/fx/assign';
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

  appendElements(elements: UMLElement[], ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    return [this, ...[...elements, ...ownedElements]];
  }

  removeElements(elements: UMLElement[], ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    return [this, ...ownedElements];
  }

  resize(ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    return [this, ...ownedElements];
  }
}
