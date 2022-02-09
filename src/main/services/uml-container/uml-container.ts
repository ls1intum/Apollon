import { DeepPartial } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type.js';
import { UMLElementType } from '../../packages/uml-element-type.js';
import * as Apollon from '../../typings.js';
import { assign } from '../../utils/fx/assign.js';
import { ILayer } from '../layouter/layer.js';
import { ILayoutable } from '../layouter/layoutable.js';
import { IUMLElement, UMLElement } from '../uml-element/uml-element.js';
import { UMLElementFeatures } from '../uml-element/uml-element-features.js';

export interface IUMLContainer extends IUMLElement {
  type: UMLElementType | UMLDiagramType;
  ownedElements: string[];
}

export abstract class UMLContainer extends UMLElement implements IUMLContainer {
  static features: UMLElementFeatures = { ...UMLElement.features, droppable: true };

  static isUMLContainer = (element: IUMLElement): element is IUMLContainer => 'ownedElements' in element;

  abstract type: UMLElementType | UMLDiagramType;
  ownedElements: string[] = [];

  constructor(values?: DeepPartial<IUMLContainer>) {
    super();
    assign<IUMLContainer>(this, values);
  }

  /**
   * reorders children -> default, do nothing
   */
  reorderChildren(children: IUMLElement[]): string[] {
    return children.map((child) => child.id);
  }

  /** Serializes an `UMLElement` to an `Apollon.UMLElement` */
  serialize(children?: UMLElement[]): Apollon.UMLModelElement {
    return {
      ...super.serialize(children),
      type: this.type as UMLElementType,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(values: T, children: Apollon.UMLModelElement[] = []) {
    super.deserialize(values);
    this.ownedElements = children.map((child) => child.id);
  }

  abstract render(canvas: ILayer, children?: ILayoutable[]): ILayoutable[];
}
