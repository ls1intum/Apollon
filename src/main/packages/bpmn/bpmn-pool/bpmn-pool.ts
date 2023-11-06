import { BPMNElementType } from '..';
import { UMLElementType } from '../../uml-element-type';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLPackage } from '../../common/uml-package/uml-package';

export class BPMNPool extends UMLPackage {
  static MIN_WIDTH = 80;
  static MIN_HEIGHT = 80;
  static HEADER_WIDTH = 40;

  static features: UMLElementFeatures = {
    ...UMLElement.features,
    droppable: true,
    movable: true,
    resizable: true,
    connectable: false,
  };

  type: UMLElementType = BPMNElementType.BPMNPool;

  hasSwimlanes = (children: ILayoutable[]) =>
    children.length > 0 &&
    children.every((child: ILayoutable & { type?: UMLElementType }) => child.type === BPMNElementType.BPMNSwimlane);

  render(layer: ILayer, children: ILayoutable[] = []): ILayoutable[] {
    if (this.bounds.width < BPMNPool.MIN_WIDTH) {
      this.bounds.width = BPMNPool.MIN_WIDTH;
    }

    // We determine if the current pool has swimlanes as a pool with lanes behaves different in regard to resizing
    // compared to a pool without lanes
    const hasSwimlanes = this.hasSwimlanes(children);

    if (!hasSwimlanes) {
      // If the pool does not have lanes, we simply return the pool and its child elements
      return [this, ...children];
    }

    const calculatedContainerPoolHeight = children.reduce((acc, element) => acc + element.bounds.height, 0);

    // We reverse the swim lane array to ensure that the lanes are rendered bottom to top, ensuring that
    // the resize handles are not overlapped by the following lane.
    const repositionedChildren = children.reverse().map((element, index) => {
      // As all elements, including indirect descendents are passed as children for the export, we make sure
      // to only reposition swimlanes
      if ((element as UMLElement).type !== BPMNElementType.BPMNSwimlane) {
        return element;
      }

      return {
        ...element,
        bounds: {
          ...element.bounds,
          x: BPMNPool.HEADER_WIDTH,
          y: index > 0 ? children[index - 1].bounds.y + children[index - 1].bounds.height : 0,
          width: this.bounds.width - BPMNPool.HEADER_WIDTH,
        },
      };
    });

    // If the pool has swimlanes, we set its height to the sum of the heights of the contained swimlanes
    if (hasSwimlanes) {
      this.bounds.height =
        calculatedContainerPoolHeight < BPMNPool.MIN_HEIGHT ? BPMNPool.MIN_HEIGHT : calculatedContainerPoolHeight;
    }

    return [this, ...repositionedChildren];
  }
}
