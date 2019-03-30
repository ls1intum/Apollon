import { ObjectElementType } from '..';
import { Container } from '../../../services/container/container';
import { Element, IElement } from '../../../services/element/element';
import { UMLElement } from '../../../typings';
import { ObjectAttribute } from '../object-attribute/object-attribute';

export class ObjectName extends Container {
  static features = {
    ...Container.features,
    droppable: false,
    resizable: 'WIDTH' as 'WIDTH' | 'BOTH' | 'HEIGHT' | 'NONE',
  };

  type = ObjectElementType.ObjectName;

  get headerHeight() {
    return 40;
  }

  constructor(values?: UMLElement | IElement) {
    super(values);
  }

  render(elements: Element[]): Element[] {
    const [parent, ...children] = super.render(elements);

    let y = this.headerHeight;
    for (const child of children) {
      child.bounds.y = y;
      child.bounds.width = this.bounds.width;
      y += child.bounds.height;
    }

    parent.bounds.height = y;
    return [parent, ...children];
  }

  resize(children: Element[]): Element[] {
    const minWidth = children.reduce((width, child) => Math.max(width, ObjectAttribute.calculateWidth(child.name)), 100);
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
