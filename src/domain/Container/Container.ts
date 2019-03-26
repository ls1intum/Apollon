import { Element, IElement } from './../Element';
import { UMLElement } from '../..';

export interface IContainer extends IElement {
  ownedElements: string[];
}

abstract class Container extends Element implements IContainer {
  static features = { ...Element.features, droppable: true };

  ownedElements: string[] = [];

  constructor(values?: IContainer);
  constructor(values?: UMLElement);
  constructor(values?: UMLElement | IElement);
  constructor(values?: UMLElement | IContainer) {
    super(values);
    if (values && 'ownedElements'in values) {
      this.ownedElements = values.ownedElements;
    }
  }

  render(children: Element[]): Element[] {
    return [this, ...children];
  }

  addElement(newElement: Element, currentElements: Element[]): Element[] {
    this.ownedElements.push(newElement.id);
    newElement.owner = this.id;
    return [this, ...currentElements, newElement];
  }

  removeElement(removedElement: string, currentElements: Element[]): Element[] {
    this.ownedElements = this.ownedElements.filter(id => id !== removedElement);
    const children = currentElements.filter(e => e.id !== removedElement);
    return [this, ...children];
  }

  resizeElement(children: Element[]): Element[] {
    return [this, ...children];
  }

  fromUMLElement<T extends typeof Element>(
    umlElement: UMLElement,
    Clazz: T
  ): Element {
    return Object.setPrototypeOf(
      {
        id: umlElement.id,
        name: umlElement.name,
        owner: umlElement.owner,
        type: umlElement.type,
        bounds: umlElement.bounds,
        base: 'Container',
        hovered: false,
        selected: false,
      },
      Clazz.prototype
    );
  }
}

export default Container;
