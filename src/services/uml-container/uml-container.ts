import { IUMLElement, UMLElement } from '../uml-element/uml-element';

export interface IUMLContainer extends IUMLElement {
  ownedElements: string[];
}

export abstract class UMLContainer extends UMLElement implements IUMLContainer {
  static features = { ...UMLElement.features, droppable: true };

  ownedElements: string[];

  constructor(values?: IUMLContainer | IUMLElement) {
    super(values);

    this.ownedElements = values && 'ownedElements' in values ? values.ownedElements : [];
  }

  render(children: UMLElement[]): UMLElement[] {
    return [this, ...children];
  }

  resize(children: UMLElement[]): UMLElement[] {
    return [this, ...children];
  }
}
