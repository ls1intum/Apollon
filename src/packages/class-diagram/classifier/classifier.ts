import { DeepPartial } from 'redux';
import { ClassElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLContainer, UMLContainer } from '../../../services/uml-container/uml-container';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { assign } from '../../../utils/fx/assign';
import { ClassAttribute } from '../class-member/class-attribute/class-attribute';
import { ClassMethod } from '../class-member/class-method/class-method';

export abstract class Classifier extends UMLContainer {
  static features: UMLElementFeatures = {
    ...UMLContainer.features,
    droppable: false,
    resizable: 'WIDTH',
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

  constructor(values?: DeepPartial<IUMLContainer>) {
    super();
    assign<IUMLContainer>(this, values);
  }

  // constructor(values?: IUMLContainer | IUMLElement) {
  //   super();

  //   if (!values) return;

  // if ('attributes' in values) {
  //   delete values.attributes;
  // }
  // if ('methods' in values) {
  //   delete values.methods;
  // }

  // super(values);
  // }

  appendElements(elements: UMLElement[], ownedElements: UMLContainer[]): [UMLContainer, ...UMLElement[]] {
    return [this];
    // return this.render([...elements, ...ownedElements]);
  }

  removeElements(elements: UMLElement[], ownedElements: UMLContainer[]): [UMLContainer, ...UMLElement[]] {
    return [this];
    // return this.render([...ownedElements]);
  }

  render(layer: ILayer, children?: ILayoutable[]): ILayoutable[] {
    if (!children) {
      return [this];
    }

    const attributes = children.filter(child => child instanceof ClassAttribute);
    const methods = children.filter(child => child instanceof ClassMethod);

    let y = this.headerHeight;
    for (const attribute of attributes) {
      attribute.render(layer);
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
    // const minWidth = ownedElements.reduce(
    //   (width, child) => Math.max(width, ClassMember.calculateWidth(child.name)),
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
    return [this, ...[...attributes, ...methods]];
  }
}
