import { UMLElement } from '../../typings';
import { Element, IElement } from '../element/element';

export interface IContainer extends IElement {
  ownedElements: string[];
}

export abstract class Container extends Element implements IContainer {
  static features = { ...Element.features, droppable: true };

  ownedElements: string[];

  constructor(values?: IContainer);
  constructor(values?: UMLElement);
  constructor(values?: UMLElement | IElement);
  constructor(values?: UMLElement | IContainer) {
    super(values);

    this.ownedElements = values && 'ownedElements' in values ? values.ownedElements : [];
  }

  render(children: Element[]): Element[] {
    return [this, ...children];
  }

  resize(children: Element[]): Element[] {
    return [this, ...children];
  }
}
