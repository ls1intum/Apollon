import { Element, IElement } from '../../../services/element/element';
import { Container, IContainer } from '../../../services/container/container';
import { ClassElementType, UMLClassifier } from '..';
import { ClassMember } from '../class-member/class-member';
import { ClassAttribute } from '../class-member/class-attribute/class-attribute';
import { ClassMethod } from '../class-member/class-method/class-method';
import { UMLElement } from '../../../typings';

export abstract class Classifier extends Container {
  static features = {
    ...Container.features,
    droppable: false,
    resizable: 'WIDTH' as 'WIDTH' | 'BOTH' | 'HEIGHT' | 'NONE',
  };

  get isAbstract() {
    return this.type === ClassElementType.AbstractClass;
  }

  get isInterface() {
    return this.type === ClassElementType.Interface;
  }

  get isEnumeration() {
    return this.type === ClassElementType.Enumeration;
  }

  get headerHeight() {
    return this.isInterface || this.isEnumeration ? 50 : 40;
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

  render(elements: Element[]): Element[] {
    let [parent, ...children] = super.render(elements);
    const attributes = children.filter(c => c instanceof ClassAttribute);
    let methods = children.filter(c => c instanceof ClassMethod);

    let y = this.headerHeight;
    for (const child of attributes) {
      child.bounds.y = y;
      child.bounds.width = this.bounds.width;
      y += child.bounds.height;
    }
    if (!this.isEnumeration) {
      this.deviderPosition = y;
      for (const child of methods) {
        child.bounds.y = y;
        child.bounds.width = this.bounds.width;
        y += child.bounds.height;
      }
    } else {
      this.deviderPosition = 0;
      methods = [];
    }
    this.ownedElements = [...attributes.map(e => e.id), ...methods.map(e => e.id)];

    parent.bounds.height = y;
    return [parent, ...attributes, ...methods];
  }

  addElement(newElement: Element, currentElements: Element[]): Element[] {
    let [parent, ...children] = super.addElement(newElement, currentElements);
    return this.render(children);
  }

  removeElement(removedElement: string, currentElements: Element[]): Element[] {
    let [parent, ...children] = super.removeElement(removedElement, currentElements);
    return this.render(children);
  }

  resizeElement(children: Element[]): Element[] {
    const minWidth = children.reduce((width, child) => Math.max(width, ClassMember.calculateWidth(child.name)), 100);
    this.bounds.width = Math.max(this.bounds.width, minWidth);
    return [
      this,
      ...children.map(child => {
        child.bounds.width = this.bounds.width;
        return child;
      }),
    ];
  }

  toUMLElement(element: Classifier, children: Element[]): { element: UMLClassifier; children: Element[] } {
    const { element: base } = super.toUMLElement(element, children);
    return {
      element: {
        ...base,
        attributes: children.filter(element => element instanceof ClassAttribute).map(element => element.id),
        methods: children.filter(element => element instanceof ClassMethod).map(element => element.id),
      },
      children: children,
    };
  }
}
