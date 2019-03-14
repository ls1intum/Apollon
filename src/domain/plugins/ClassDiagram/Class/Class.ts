import Element from '../../../Element';
import Container from '../../../Container';
import { ElementKind } from '..';
import { ClassAttribute, ClassMethod } from '../ClassMember';
import ClassMember from '../ClassMember/ClassMember';

enum ClassifierType {
  Abstract,
  Interface,
  Enumeration,
}

type Classifier = ClassifierType | null;

class Class extends Container {
  static features = {
    ...Container.features,
    droppable: false,
    resizable: 'WIDTH' as 'WIDTH' | 'BOTH' | 'HEIGHT' | 'NONE',
  };

  kind = ElementKind.Class;

  static get types() {
    return ClassifierType;
  }

  get isAbstract() {
    return this.classifier === ClassifierType.Abstract;
  }

  get isInterface() {
    return this.classifier === ClassifierType.Interface;
  }

  get isEnumeration() {
    return this.classifier === ClassifierType.Enumeration;
  }

  get headerHeight() {
    return this.isInterface || this.isEnumeration ? 50 : 40;
  }

  deviderPosition = 0;

  constructor(name: string, public classifier: Classifier = null) {
    super(name);
  }

  render(elements: Element[]): Element[] {
    let [parent, ...children] = super.render(elements);
    const attributes = children.filter(c => c instanceof ClassAttribute);
    const methods = children.filter(c => c instanceof ClassMethod);

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
    }

    parent.bounds.height = y;
    return [parent, ...attributes, ...methods];
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
      (width, child) => Math.max(width, ClassMember.calculateWidth(child.name)),
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

export default Class;
