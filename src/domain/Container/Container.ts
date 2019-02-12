import Element from './../Element';

abstract class Container extends Element {
  static isDroppable = true;

  ownedElements: string[] = [];

  addElement(newElement: Element, currentElements: Element[]): Element[] {
    this.ownedElements.push(newElement.id);
    newElement.owner = this.id;
    return [this, ...currentElements, newElement];
  }

  removeElement(removedElement: Element, currentElements: Element[]): Element[] {
    this.ownedElements = this.ownedElements.filter(id => id !== removedElement.id);
    const children = currentElements.filter(e => e.id !== removedElement.id);
    return [this, ...children];
  }

  resizeElement(children: Element[]): Element[] {
    return children;
  }
}

export default Container;
