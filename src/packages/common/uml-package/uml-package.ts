import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLContainer } from '../../../services/uml-container/uml-container';
import { computeBoundingBoxForElements, IBoundary } from '../../../utils/geometry/boundary';
import { Text } from '../../../utils/svg/text';

export abstract class UMLPackage extends UMLContainer {

  render(layer: ILayer, children: ILayoutable[] = []): ILayoutable[] {
    const radix = 10;
    const nameBounds: IBoundary = {
      x: this.bounds.x,
      y: this.bounds.y,
      width: Math.round((Text.size(layer, this.name, { fontWeight: 'bold' }).width + 20) / radix) * radix,
      height: 20,
    };

    const absoluteElements = children.map(element => {
      element.bounds.x += this.bounds.x;
      element.bounds.y += this.bounds.y;
      return element;
    });
    const bounds = computeBoundingBoxForElements([this, { bounds: nameBounds }, ...absoluteElements]);
    const relativeElements = absoluteElements.map(element => {
      element.bounds.x -= this.bounds.x;
      element.bounds.y -= this.bounds.y;
      return element;
    });
    const deltaX = bounds.x - this.bounds.x;
    const deltaY = bounds.y - this.bounds.y;
    relativeElements.forEach(child => {
      child.bounds.x -= deltaX;
      child.bounds.y -= deltaY;
    });

    this.bounds = bounds;
    return [this, ...relativeElements];
  }
}
