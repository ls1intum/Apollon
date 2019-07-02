import { Apollon } from '@ls1intum/apollon';
import { DeepPartial } from 'redux';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLContainer, UMLContainer } from '../../../services/uml-container/uml-container';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { assign } from '../../../utils/fx/assign';
import { Text } from '../../../utils/svg/text';
import { UMLElementType } from '../../uml-element-type';
import { UMLClassifierAttribute } from './uml-classifier-attribute';
import { UMLClassifierMethod } from './uml-classifier-method';

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

  italic: boolean = false;
  underline: boolean = false;
  stereotype: string | null = null;
  deviderPosition: number = 0;

  get headerHeight() {
    return this.stereotype ? 50 : 40;
  }

  constructor(values?: DeepPartial<IUMLClassifier>) {
    super();
    assign<IUMLClassifier>(this, values);
  }

  serialize(children: UMLElement[] = []): Apollon.UMLClassifier {
    return {
      ...super.serialize(children),
      type: this.type as UMLElementType,
      attributes: children.filter(x => x instanceof UMLClassifierAttribute).map(x => x.id),
      methods: children.filter(x => x instanceof UMLClassifierMethod).map(x => x.id),
    };
  }

  appendElements(elements: UMLElement[], ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    return [this];
  }

  removeElements(elements: UMLElement[], ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    return [this];
  }

  render(canvas: ILayer, children: ILayoutable[] = []): ILayoutable[] {
    const attributes = children.filter((x): x is UMLClassifierAttribute => x instanceof UMLClassifierAttribute);
    const methods = children.filter((x): x is UMLClassifierMethod => x instanceof UMLClassifierMethod);

    const width = [this, ...attributes, ...methods].reduce(
      (current, child) => Math.max(current, Text.width(canvas, child.name) + 20),
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
