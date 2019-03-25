import Element, { IElement } from './../Element';

export interface IContainer extends IElement {
  ownedElements: string[];
}

abstract class Container extends Element implements IContainer {
  static features = { ...Element.features, droppable: true };

  ownedElements: string[] = [];

  constructor(values?: Partial<IContainer>) {
    super(values);
    Object.assign(this, values);
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
}

export default Container;
