import { DeepPartial } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { UMLElementType } from '../../packages/uml-element-type';
import { assign } from '../../utils/assign';
import { IUMLElement, UMLElement } from '../uml-element/uml-element';

export interface IUMLContainer extends IUMLElement {
  type: UMLElementType | UMLDiagramType;
  ownedElements: string[];
}

export abstract class UMLContainer extends UMLElement implements IUMLContainer {
  static features = { ...UMLElement.features, droppable: true };

  abstract readonly type: UMLElementType | UMLDiagramType;
  ownedElements: string[] = [];

  constructor(values?: DeepPartial<IUMLContainer>) {
    super();
    assign<IUMLContainer>(this, values);
  }

  render(ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    return [this, ...ownedElements];
  }

  resize(children: UMLElement[]): UMLElement[] {
    return [this, ...children];
  }
}
