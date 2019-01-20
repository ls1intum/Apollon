import Element from './../Element';

abstract class Container extends Element {
  ownedElements: string[] = [];

  addElement(newElement: Element, currentElements: Element[]): Element[] {
    this.ownedElements.push(newElement.id);
    newElement.owner = this.id;
    return [this, ...currentElements, newElement];
  }
}

export default Container;
