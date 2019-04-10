import { ObjectElementType } from '..';
import { Container, IContainer } from '../../../services/container/container';
import { Element, IElement } from '../../../services/element/element';
import { UMLElement } from '../../../typings';
import { UMLClassifier } from '../../class-diagram';
import { ObjectAttribute } from '../object-member/object-attribute/object-attribute';
import { ObjectMember } from '../object-member/object-member';
import { ObjectMethod } from '../object-member/object-method/object-method';

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

  deviderPosition = 0;

  constructor(values?: UMLClassifier);
  constructor(values?: IContainer);
  constructor(values?: UMLElement | IElement);
  constructor(values?: UMLClassifier | IContainer) {
    super();

    if (!values) return;

    if ('attributes' in values) {
      delete values.attributes;
    }
    if ('methods' in values) {
      delete values.methods;
    }

    super(values);
  }

  render(children: Element[]): Element[] {
    const attributes = children.filter(child => child instanceof ObjectAttribute);
    const methods = children.filter(child => child instanceof ObjectMethod);

    let y = this.headerHeight;
    for (const attribute of attributes) {
      attribute.bounds.x = 0;
      attribute.bounds.y = y;
      attribute.bounds.width = this.bounds.width;
      y += attribute.bounds.height;
    }
    this.deviderPosition = y;
    for (const method of methods) {
      method.bounds.x = 0;
      method.bounds.y = y;
      method.bounds.width = this.bounds.width;
      y += method.bounds.height;
    }

    this.bounds.height = y;
    return [this, ...attributes, ...methods];
  }

  resize(children: Element[]): Element[] {
    const minWidth = children.reduce((width, child) => Math.max(width, ObjectMember.calculateWidth(child.name)), 100);
    this.bounds.width = Math.max(this.bounds.width, minWidth);
    return [
      this,
      ...children.map(child => {
        child.bounds.width = this.bounds.width;
        return child;
      }),
    ];
  }

  toUMLElement(element: ObjectName, children: Element[]): { element: UMLClassifier; children: Element[] } {
    const { element: base } = super.toUMLElement(element, children);
    return {
      element: {
        ...base,
        attributes: children.filter(child => child instanceof ObjectAttribute).map(child => child.id),
        methods: children.filter(child => child instanceof ObjectMethod).map(child => child.id),
      },
      children,
    };
  }
}
