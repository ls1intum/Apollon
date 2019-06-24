import { DeepPartial } from 'redux';
import { ComponentElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLContainer, UMLContainer } from '../../../services/uml-container/uml-container';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { assign } from '../../../utils/fx/assign';
import { computeBoundingBoxForElements } from '../../../utils/geometry/boundary';

export class Component extends UMLContainer {
  type = ComponentElementType.Component;

  constructor(values?: DeepPartial<IUMLContainer>) {
    super();
    assign<IUMLContainer>(this, values);
  }

  appendElements(elements: UMLElement[], ownedElements: UMLContainer[]): [UMLContainer, ...UMLElement[]] {
    return [this];
  }

  removeElements(elements: UMLElement[], ownedElements: UMLContainer[]): [UMLContainer, ...UMLElement[]] {
    return [this];
  }

  render(layer: ILayer, children: ILayoutable[] = []): ILayoutable[] {
    const parent = this;
    const elements = children.filter((x): x is UMLElement => x instanceof UMLElement);
    const absoluteChildren: UMLElement[] = elements.map<UMLElement>(child => {
      child.bounds.x += parent.bounds.x;
      child.bounds.y += parent.bounds.y;
      return child;
    });
    const bounds = computeBoundingBoxForElements([parent, ...absoluteChildren]);
    const relativeChildren: UMLElement[] = absoluteChildren.map<UMLElement>(child => {
      child.bounds.x -= parent.bounds.x;
      child.bounds.y -= parent.bounds.y;
      return child;
    });
    const deltaX = bounds.x - parent.bounds.x;
    const deltaY = bounds.y - parent.bounds.y;
    relativeChildren.forEach(child => {
      child.bounds.x -= deltaX;
      child.bounds.y -= deltaY;
    });
    const resizedParent = new Component({ ...parent, bounds });
    return [resizedParent, ...relativeChildren];
  }

  // resize(children: Element[]): Element[] {
  //   const bounds = computeBoundingBoxForElements(children);
  //   this.bounds.width = Math.max(this.bounds.width, bounds.x + bounds.width, 100);
  //   this.bounds.height = Math.max(this.bounds.height, bounds.y + bounds.height, 40);
  //   return [this, ...children];
  // }
}
