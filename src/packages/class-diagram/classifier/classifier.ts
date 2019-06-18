import { DeepPartial } from 'redux';
import { ClassElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLContainer, UMLContainer } from '../../../services/uml-container/uml-container';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { assign } from '../../../utils/fx/assign';
import { Text } from '../../../utils/svg/text';
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

  render(layer: ILayer, children: ILayoutable[] = []): ILayoutable[] {
    const attributes = children.filter((x): x is ClassAttribute => x instanceof ClassAttribute);
    const methods = children.filter((x): x is ClassMethod => x instanceof ClassMethod);
    const width = [this, ...attributes, ...methods].reduce(
      (current, child) => Math.max(current, Text.width(layer, child.name) + 20),
      this.bounds.width,
    );

    this.bounds.width = Math.round(width / 10) * 10;

    let y = this.headerHeight;
    for (const attribute of attributes) {
      attribute.bounds.y = y;
      attribute.bounds.width = this.bounds.width;
      y += attribute.bounds.height;
    }
    this.deviderPosition = y;
    for (const method of methods) {
      method.bounds.y = y;
      method.bounds.width = this.bounds.width;
      y += method.bounds.height;
    }

    this.bounds.height = y;
    return [this, ...attributes, ...methods];
  }
}
