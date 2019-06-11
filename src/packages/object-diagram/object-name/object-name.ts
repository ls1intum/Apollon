import { ObjectElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLContainer, UMLContainer } from '../../../services/uml-container/uml-container';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';

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

  appendElements(elements: UMLElement[], ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    return [this];
    // return this.render([...elements, ...ownedElements]);
  }

  removeElements(elements: UMLElement[], ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    return [this];
    // return this.render([...ownedElements]);
  }

  render(layer: ILayer, children?: ILayoutable[]): ILayoutable[] {
    return [this];
    // if (!ownedElements) {
    //   return [this];
    // }

    // const attributes = ownedElements.filter(child => child instanceof ObjectAttribute);
    // const methods = ownedElements.filter(child => child instanceof ObjectMethod);

    // let y = this.headerHeight;
    // for (const attribute of attributes) {
    //   attribute.bounds.x = 0;
    //   attribute.bounds.y = y;
    //   attribute.bounds.width = this.bounds.width;
    //   y += attribute.bounds.height;
    // }
    // this.deviderPosition = y;
    // for (const method of methods) {
    //   method.bounds.x = 0;
    //   method.bounds.y = y;
    //   method.bounds.width = this.bounds.width;
    //   y += method.bounds.height;
    // }
    // const minWidth = ownedElements.reduce(
    //   (width, child) => Math.max(width, ObjectMember.calculateWidth(child.name)),
    //   100,
    // );
    // this.bounds.width = Math.max(this.bounds.width, minWidth);
    // return [
    //   this,
    //   ...[...attributes, ...methods].map(child => {
    //     child.bounds.width = this.bounds.width;
    //     return child;
    //   }),
    // ];
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
