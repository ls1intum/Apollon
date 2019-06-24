import { UseCaseElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLContainer } from '../../../services/uml-container/uml-container';
import { UMLElement } from '../../../services/uml-element/uml-element';
export class UseCaseSystem extends UMLContainer {
  static features = { ...UMLContainer.features, connectable: false };
  type = UseCaseElementType.UseCaseSystem;

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

    // const parent = this;
    // const absoluteChildren: UMLElement[] = ownedElements.map<UMLElement>(child => {
    //   child.bounds.x += parent.bounds.x;
    //   child.bounds.y += parent.bounds.y;
    //   return child;
    // });
    // const bounds = computeBoundingBoxForElements([parent, ...absoluteChildren]);
    // const relativeChildren: UMLElement[] = absoluteChildren.map<UMLElement>(child => {
    //   child.bounds.x -= parent.bounds.x;
    //   child.bounds.y -= parent.bounds.y;
    //   return child;
    // });
    // const deltaX = bounds.x - parent.bounds.x;
    // const deltaY = bounds.y - parent.bounds.y;
    // relativeChildren.forEach(child => {
    //   child.bounds.x -= deltaX;
    //   child.bounds.y -= deltaY;
    // });
    // const resizedParent = new UseCaseSystem({ ...(parent as UMLContainer), bounds });
    // return [resizedParent, ...relativeChildren];
  }

  // resize(ownedElements: UMLElement[]): [UMLContainer, ...UMLElement[]] {
  //   const bounds = computeBoundingBoxForElements(ownedElements);
  //   this.bounds.width = Math.max(this.bounds.width, bounds.x + bounds.width, 100);
  //   this.bounds.height = Math.max(this.bounds.height, bounds.y + bounds.height, 100);
  //   return [this, ...ownedElements];
  // }
}
