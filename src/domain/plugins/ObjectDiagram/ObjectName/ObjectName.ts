import Element from '../../../Element';
import Container from '../../../Container';
import { ElementKind } from '..';
import { ObjectAttribute } from '../ObjectAttribute';

class ObjectName extends Container {
  static features = {
    ...Container.features,
    droppable: false,
    resizable: 'WIDTH' as 'WIDTH' | 'BOTH' | 'HEIGHT' | 'NONE',
  };

  kind = ElementKind.ObjectName;

  get headerHeight() {
    return 40;
  }

  render(elements: Element[]): Element[] {
    let [parent, ...children] = super.render(elements);

    let y = this.headerHeight;
    for (const child of children) {
      child.bounds.y = y;
      child.bounds.width = this.bounds.width;
      y += child.bounds.height;
    }

    parent.bounds.height = y;
    return [parent, ...children];
  }

  addElement(newElement: Element, currentElements: Element[]): Element[] {
    let [parent, ...children] = super.addElement(newElement, currentElements);
    return this.render(children);
  }

  removeElement(removedElement: string, currentElements: Element[]): Element[] {
    let [parent, ...children] = super.removeElement(
      removedElement,
      currentElements
    );
    return this.render(children);
  }

  resizeElement(children: Element[]): Element[] {
    const minWidth = children.reduce(
      (width, child) =>
        Math.max(width, ObjectAttribute.calculateWidth(child.name)),
      100
    );
    this.bounds.width = Math.max(this.bounds.width, minWidth);
    return [
      this,
      ...children.map(child => {
        child.bounds.width = this.bounds.width;
        return child;
      }),
    ];
  }
}

export default ObjectName;
