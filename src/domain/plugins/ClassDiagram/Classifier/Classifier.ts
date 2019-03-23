import Element from '../../../Element';
import Container from '../../../Container';
import { ElementKind, UMLClassifier, UMLClassMember } from '..';
import ClassMember from '../ClassMember/ClassMember';
import { ClassAttribute } from '../ClassMember/ClassAttribute';
import { ClassMethod } from '../ClassMember/ClassMethod';

abstract class Classifier extends Container {
  static features = {
    ...Container.features,
    droppable: false,
    resizable: 'WIDTH' as 'WIDTH' | 'BOTH' | 'HEIGHT' | 'NONE',
  };

  get isAbstract() {
    return this.kind === ElementKind.AbstractClass;
  }

  get isInterface() {
    return this.kind === ElementKind.Interface;
  }

  get isEnumeration() {
    return this.kind === ElementKind.Enumeration;
  }

  get headerHeight() {
    return this.isInterface || this.isEnumeration ? 50 : 40;
  }

  deviderPosition = 0;

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
    this.ownedElements = [
      ...attributes.map(e => e.id),
      ...methods.map(e => e.id),
    ];

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

  static toUMLElement(
    element: Classifier,
    children: Element[]
  ): { element: UMLClassifier; children: Element[] } {
    const { element: base } = Element.toUMLElement(element, children);
    return {
      element: {
        ...base,
        attributes: children
          .filter(element => element instanceof ClassAttribute)
          .map<UMLClassMember>(element => ({
            id: element.id,
            type: ElementKind.ClassAttribute,
            name: element.name,
            bounds: element.bounds,
          })),
        methods: children
          .filter(element => element instanceof ClassMethod)
          .map<UMLClassMember>(element => ({
            id: element.id,
            type: ElementKind.ClassAttribute,
            name: element.name,
            bounds: element.bounds,
          })),
      },
      children: [],
    };
  }

  static fromUMLElement(umlElement: UMLClassifier): Element[] {
    const [element] = Element.fromUMLElement(umlElement, Classifier);
    const attributes: ClassAttribute[] = umlElement.attributes.map<
      ClassAttribute
    >(attribute =>
      Object.setPrototypeOf(
        {
          id: attribute.id,
          name: attribute.name,
          owner: umlElement.id,
          kind: ElementKind.ClassAttribute,
          bounds: { x: 0, y: 0, width: 0, height: 30 },
          base: 'Element',
          hovered: false,
          selected: false,
        },
        ClassAttribute.prototype
      )
    );
    const methods: ClassMethod[] = umlElement.methods.map<ClassMethod>(
      attribute =>
        Object.setPrototypeOf(
          {
            id: attribute.id,
            name: attribute.name,
            owner: umlElement.id,
            kind: ElementKind.ClassMethod,
            bounds: { x: 0, y: 0, width: 0, height: 30 },
            base: 'Element',
            hovered: false,
            selected: false,
          },
          ClassMethod.prototype
        )
    );
    return (element as Container).render([element, ...attributes, ...methods]);
  }
}

export default Classifier;
