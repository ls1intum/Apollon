import { DeepPartial } from 'redux';
import { ILayer } from '../../../services/layouter/layer.js';
import { ILayoutable } from '../../../services/layouter/layoutable.js';
import { IUMLContainer, UMLContainer } from '../../../services/uml-container/uml-container.js';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element.js';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features.js';
import * as Apollon from '../../../typings.js';
import { assign } from '../../../utils/fx/assign.js';
import { Text } from '../../../utils/svg/text.js';
import { UMLElementType } from '../../uml-element-type.js';
import { UMLClassifierAttribute } from './uml-classifier-attribute.js';
import { UMLClassifierMethod } from './uml-classifier-method.js';

export interface IUMLClassifier extends IUMLContainer {
  italic: boolean;
  underline: boolean;
  stereotype: string | null;
  deviderPosition: number;
}

export abstract class UMLClassifier extends UMLContainer implements IUMLClassifier {
  static features: UMLElementFeatures = {
    ...UMLContainer.features,
    droppable: false,
    resizable: 'WIDTH',
  };
  static stereotypeHeaderHeight = 50;
  static nonStereotypeHeaderHeight = 40;

  italic: boolean = false;
  underline: boolean = false;
  stereotype: string | null = null;
  deviderPosition: number = 0;

  get headerHeight() {
    return this.stereotype ? UMLClassifier.stereotypeHeaderHeight : UMLClassifier.nonStereotypeHeaderHeight;
  }

  constructor(values?: DeepPartial<IUMLClassifier>) {
    super();
    assign<IUMLClassifier>(this, values);
  }

  abstract reorderChildren(children: IUMLElement[]): string[];

  serialize(children: UMLElement[] = []): Apollon.UMLClassifier {
    return {
      ...super.serialize(children),
      type: this.type as UMLElementType,
      attributes: children.filter((x) => x instanceof UMLClassifierAttribute).map((x) => x.id),
      methods: children.filter((x) => x instanceof UMLClassifierMethod).map((x) => x.id),
    };
  }

  render(layer: ILayer, children: ILayoutable[] = []): ILayoutable[] {
    const attributes = children.filter((x): x is UMLClassifierAttribute => x instanceof UMLClassifierAttribute);
    const methods = children.filter((x): x is UMLClassifierMethod => x instanceof UMLClassifierMethod);

    const radix = 10;
    this.bounds.width = [this, ...attributes, ...methods].reduce(
      (current, child, index) =>
        Math.max(
          current,
          Math.round(
            (Text.size(layer, child.name, index === 0 ? { fontWeight: 'bold' } : undefined).width + 20) / radix,
          ) * radix,
        ),
      Math.round(this.bounds.width / radix) * radix,
    );

    let y = this.headerHeight;
    for (const attribute of attributes) {
      attribute.bounds.x = 0.5;
      attribute.bounds.y = y + 0.5;
      attribute.bounds.width = this.bounds.width - 1;
      y += attribute.bounds.height;
    }
    y += 1;
    this.deviderPosition = y;
    for (const method of methods) {
      method.bounds.x = 0.5;
      method.bounds.y = y + 0.5;
      method.bounds.width = this.bounds.width - 1;
      y += method.bounds.height;
    }

    this.bounds.height = y + 1;
    return [this, ...attributes, ...methods];
  }
}
