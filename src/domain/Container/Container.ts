import Element from './../Element';
import { UMLElement } from '../..';

abstract class Container extends Element {
  static features = { ...Element.features, droppable: true };

  base = 'Container';
  ownedElements: string[] = [];

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


  static fromUMLElement<T extends typeof Element>(
    umlElement: UMLElement,
    Clazz: T
  ): Element {
    return Object.setPrototypeOf(
      {
        id: umlElement.id,
        name: umlElement.name,
        owner: umlElement.owner,
        kind: umlElement.type,
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
