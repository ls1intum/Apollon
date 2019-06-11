import { CommonElementType } from '..';
import { UMLContainer } from '../../../services/uml-container/uml-container';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { computeBoundingBoxForElements } from '../../../utils/geometry/boundary';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { ILayer } from '../../../services/layouter/layer';

export class Package extends UMLContainer {
  static features = {
    ...UMLContainer.features,
    connectable: false,
  };

  type = CommonElementType.Package;

  appendElements(elements: UMLElement[], ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    const absoluteElements: UMLElement[] = elements.map<UMLElement>(element => {
      element.bounds.x += this.bounds.x;
      element.bounds.y += this.bounds.y;
      return element;
    });
    const bounds = computeBoundingBoxForElements([this, ...absoluteElements]);
    const relativeElements: UMLElement[] = absoluteElements.map<UMLElement>(element => {
      element.bounds.x -= this.bounds.x;
      element.bounds.y -= this.bounds.y;
      return element;
    });
    const deltaX = bounds.x - this.bounds.x;
    const deltaY = bounds.y - this.bounds.y;
    [...relativeElements, ...ownedElements].forEach(child => {
      child.bounds.x -= deltaX;
      child.bounds.y -= deltaY;
    });

    return [new Package({ ...this, bounds }), ...[...relativeElements, ...ownedElements]];
  }

  removeElements(elements: UMLElement[], ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
    return [this];
  }

  render(layer: ILayer, children?: ILayoutable[]): ILayoutable[] {
    return [this];
    // if (!children) {
    //   return [this];
    // }

    // const absoluteElements: UMLElement[] = children.map<UMLElement>(element => {
    //   element.bounds.x += this.bounds.x;
    //   element.bounds.y += this.bounds.y;
    //   return element;
    // });
    // const bounds = computeBoundingBoxForElements([this, ...absoluteElements]);
    // const relativeElements: UMLElement[] = absoluteElements.map<UMLElement>(element => {
    //   element.bounds.x -= this.bounds.x;
    //   element.bounds.y -= this.bounds.y;
    //   return element;
    // });
    // const deltaX = bounds.x - this.bounds.x;
    // const deltaY = bounds.y - this.bounds.y;
    // relativeElements.forEach(child => {
    //   child.bounds.x -= deltaX;
    //   child.bounds.y -= deltaY;
    // });

    // // bounds.width = Math.max(this.bounds.width, bounds.x + bounds.width, 100);
    // // bounds.height = Math.max(this.bounds.height, bounds.y + bounds.height, 100);
    // return [new Package({ ...this, bounds }), ...relativeElements];
  }
}
