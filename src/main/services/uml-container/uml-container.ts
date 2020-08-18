import { DeepPartial } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { UMLElementType } from '../../packages/uml-element-type';
import * as Apollon from '../../typings';
import { assign } from '../../utils/fx/assign';
import { ILayer } from '../layouter/layer';
import { ILayoutable } from '../layouter/layoutable';
import { IUMLElement, UMLElement } from '../uml-element/uml-element';
import { UMLElementFeatures } from '../uml-element/uml-element-features';

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
