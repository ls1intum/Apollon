import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLContainer } from '../../../services/uml-container/uml-container';
import { computeBoundingBoxForElements } from '../../../utils/geometry/boundary';
import { calculateNameBounds } from '../../../utils/name-bounds';

export abstract class UMLPackage extends UMLContainer {
  render(layer: ILayer, children: ILayoutable[] = [], calculateWithoutChildren?: boolean): ILayoutable[] {
    const calculatedNamedBounds = calculateNameBounds(this, layer);

    const absoluteElements = children.map((element) => {
      element.bounds.x += this.bounds.x;
      element.bounds.y += this.bounds.y;
      return element;
    });
    let bounds = computeBoundingBoxForElements([{ bounds: calculatedNamedBounds }, ...absoluteElements]);
    if (calculateWithoutChildren) {
      bounds = calculatedNamedBounds;
    }
    const relativeElements = absoluteElements.map((element) => {
      element.bounds.x -= this.bounds.x;
      element.bounds.y -= this.bounds.y;
      return element;
    });
    const deltaX = bounds.x - this.bounds.x;
    const deltaY = bounds.y - this.bounds.y;
    relativeElements.forEach((child) => {
      child.bounds.x -= deltaX;
      child.bounds.y -= deltaY;
    });

    this.bounds = bounds;
    return [this, ...relativeElements];
  }
}
