import { BPMNElementType } from '..';
import { UMLElementType } from '../../uml-element-type';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLContainer } from '../../../services/uml-container/uml-container';

export class BPMNPool extends UMLContainer {
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

  hasSwimlanes(children: (ILayoutable & { type?: UMLElementType })[] = []): boolean {
    return children.length > 0 && children.every((child) => child.type === BPMNElementType.BPMNSwimlane);
  }

  render(layer: ILayer, children: ILayoutable[] = []): ILayoutable[] {
    if (this.bounds.width < BPMNPool.MIN_WIDTH) {
      this.bounds.width = BPMNPool.MIN_WIDTH;
    }

    if (!this.hasSwimlanes(children)) {
      return [this, ...children];
    }

    const calculatedContainerPoolHeight = children.reduce((acc, element) => acc + element.bounds.height, 0);

    // We reverse the swim lane array to ensure that the lanes are rendered bottom to top, ensuring that
    // the resize handles are not overlapped by the following lane.
    const repositionedChildren = children.reverse().map((element, index) => {
      element.bounds.x = BPMNPool.HEADER_WIDTH;
      element.bounds.y = index > 0 ? children[index - 1].bounds.y + children[index - 1].bounds.height : 0;
      element.bounds.width = this.bounds.width - BPMNPool.HEADER_WIDTH;

      return element;
    });

    if (this.hasSwimlanes(children)) {
      this.bounds.height =
        calculatedContainerPoolHeight < BPMNPool.MIN_HEIGHT ? BPMNPool.MIN_HEIGHT : calculatedContainerPoolHeight;
    }

    return [this, ...repositionedChildren];
  }
}
