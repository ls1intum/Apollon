import { ObjectElementType } from '..';
import { IUMLContainer, UMLContainer } from '../../../services/uml-container/uml-container';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { ObjectAttribute } from '../object-member/object-attribute/object-attribute';
import { ObjectMember } from '../object-member/object-member';
import { ObjectMethod } from '../object-member/object-method/object-method';

export class ObjectName extends UMLContainer {
  static features: UMLElementFeatures = {
    ...UMLContainer.features,
    droppable: false,
    resizable: 'WIDTH',
  };

  type = ObjectElementType.ObjectName;

  get headerHeight() {
    return 40;
  }

  deviderPosition = 0;

  constructor(values?: IUMLContainer | IUMLElement) {
    super();

    if (!values) return;

    // if ('attributes' in values) {
    //   delete values.attributes;
    // }
    // if ('methods' in values) {
    //   delete values.methods;
    // }

    // super(values);
  }

  appendElement(element: UMLElement, ownedElements: UMLContainer[]): [UMLContainer, ...UMLElement[]] {
    return this.render([element, ...ownedElements]);
  }

  removeElement(element: UMLElement, ownedElements: UMLContainer[]): [UMLContainer, ...UMLElement[]] {
    return this.render([...ownedElements]);
  }

  render(children: UMLElement[]): [UMLContainer, ...UMLElement[]] {
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
    return [this, ...[...attributes, ...methods]];
  }

  resize(ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    const minWidth = ownedElements.reduce((width, child) => Math.max(width, ObjectMember.calculateWidth(child.name)), 100);
    this.bounds.width = Math.max(this.bounds.width, minWidth);
    return [
      this,
      ...ownedElements.map(child => {
        child.bounds.width = this.bounds.width;
        return child;
      }),
    ];
  }

  // toUMLElement(element: ObjectName, children: UMLElement[]): { element: IUMLContainer; children: UMLElement[] } {
  //   const { element: base } = super.toUMLElement(element, children);
  //   return {
  //     element: {
  //       ...base,
  //       ownedElements: [],
  //       // attributes: children.filter(child => child instanceof ObjectAttribute).map(child => child.id),
  //       // methods: children.filter(child => child instanceof ObjectMethod).map(child => child.id),
  //     },
  //     children,
  //   };
  // }
}
